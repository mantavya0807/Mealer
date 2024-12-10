import { Timestamp, getFirestore } from 'firebase-admin/firestore';

interface Transaction {
  accountType: 'LionCash' | 'CampusMealPlan';
  amount: number;
  cardNumber: string;
  category: string;
  location: string;
  subcategory: string;
  timestamp: Timestamp;
  transactionType: string;
  createdAt: Timestamp;
}

interface LocationGroup {
  baseLocation: string;
  patterns: string[];
}

interface MealTimeAnalysis {
  location: string;
  visits: number;
  totalSpent: number;
  averageSpent: number;
}

interface BasicAnalytics {
  totalSpending: number;
  averageTransaction: number;
  busiestDay: string;
  topCategory: string;
  dailySpending: Record<string, number>;
  categoryBreakdown: Record<string, number>;
}

interface AnalyticsResult extends BasicAnalytics {
  consolidatedLocations: Record<string, number>;
  timeDistribution: Record<string, { count: number; totalSpent: number }>;
  monthlyTrends: Record<string, number>;
  discountAnalysis: {
    actualSpent: number;
    potentialCost: number;
    totalSaved: number;
    wastedDiscountOpportunities: number;
    mealPlanEfficiency: number;
  };
  hourlyAnalysis: {
    [hour: string]: {
      count: number;
      avgAmount: number;
      topLocations: string[];
    };
  };
  mealPreferences: {
    breakfast: MealTimeAnalysis[];
    lunch: MealTimeAnalysis[];
    dinner: MealTimeAnalysis[];
    lateNight: MealTimeAnalysis[];
  };
  recommendations: string[];
}

// Location grouping patterns
const LOCATION_GROUPS: LocationGroup[] = [
  {
    baseLocation: "Starbucks HUB",
    patterns: ["Starbucks -UP HUB", "HUB Starbucks", "Starbucks Online"]
  },
  {
    baseLocation: "Louie's",
    patterns: ["Louie's, SFD", "Louie's C-Store"]
  },
  {
    baseLocation: "Edge Coffee",
    patterns: ["Edge at", "Edge Coffee"]
  },
  {
    baseLocation: "Chick-fil-A",
    patterns: ["Chick-fil-A", "CFA"]
  }
  // Add more location groups as needed
];

// Meal time definitions
const MEAL_TIMES = {
  breakfast: { start: 6, end: 10 },
  lunch: { start: 11, end: 14 },
  dinner: { start: 17, end: 21 },
  lateNight: { start: 21, end: 24 }
};

// Discount configurations
const DISCOUNT_CONFIG = {
  mealPlan: {
    regular: 0.65,
    central: 0,
    market: 0
  },
  lionCash: {
    regular: 0.10,
    central: 0,
    market: 0.10
  },
  mealPlanCost: 2800,
  mealPlanValue: 1200
};

function consolidateLocation(location: string): string {
  for (const group of LOCATION_GROUPS) {
    if (group.patterns.some(pattern => location.includes(pattern))) {
      return group.baseLocation;
    }
  }
  return location;
}

function calculateActualCost(transaction: Transaction): number {
  const { amount, accountType, location } = transaction;
  const isMarket = location.toLowerCase().includes('market');
  const isCentral = location.toLowerCase().includes('hub') || 
                    location.toLowerCase().includes('central');

  if (accountType === 'CampusMealPlan') {
    if (isMarket || isCentral) {
      return Math.abs(amount);
    }
    return Math.abs(amount) / (1 - DISCOUNT_CONFIG.mealPlan.regular);
  }

  if (accountType === 'LionCash') {
    if (isCentral) {
      return Math.abs(amount);
    }
    return Math.abs(amount) / (1 - DISCOUNT_CONFIG.lionCash.regular);
  }

  return Math.abs(amount);
}

function getMealTimeForHour(hour: number): keyof typeof MEAL_TIMES | null {
  for (const [mealTime, range] of Object.entries(MEAL_TIMES)) {
    if (hour >= range.start && hour < range.end) {
      return mealTime as keyof typeof MEAL_TIMES;
    }
  }
  return null;
}

function analyzeMealPreferences(transactions: Transaction[]): AnalyticsResult['mealPreferences'] {
  const mealTimings = {
    breakfast: new Map<string, { visits: number; totalSpent: number }>(),
    lunch: new Map<string, { visits: number; totalSpent: number }>(),
    dinner: new Map<string, { visits: number; totalSpent: number }>(),
    lateNight: new Map<string, { visits: number; totalSpent: number }>()
  };

  transactions.forEach(t => {
    const hour = t.timestamp.toDate().getHours();
    const mealTime = getMealTimeForHour(hour);
    if (!mealTime) return;

    const location = consolidateLocation(t.location);
    const current = mealTimings[mealTime].get(location) || { visits: 0, totalSpent: 0 };
    
    mealTimings[mealTime].set(location, {
      visits: current.visits + 1,
      totalSpent: current.totalSpent + Math.abs(t.amount)
    });
  });

  const result = {
    breakfast: [] as MealTimeAnalysis[],
    lunch: [] as MealTimeAnalysis[],
    dinner: [] as MealTimeAnalysis[],
    lateNight: [] as MealTimeAnalysis[]
  };

  for (const [mealTime, locations] of Object.entries(mealTimings)) {
    const analyses = Array.from(locations.entries()).map(([location, stats]) => ({
      location,
      visits: stats.visits,
      totalSpent: stats.totalSpent,
      averageSpent: stats.totalSpent / stats.visits
    }));

    result[mealTime as keyof typeof result] = analyses.sort((a, b) => b.visits - a.visits);
  }

  return result;
}

function generateBasicAnalytics(transactions: Transaction[]): BasicAnalytics {
  const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const dailySpending = transactions.reduce((acc, t) => {
    const day = t.timestamp.toDate().getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
    acc[dayName] = (acc[dayName] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const categoryBreakdown = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const busiestDay = Object.entries(dailySpending)
    .sort(([,a], [,b]) => b - a)[0][0];

  const topCategory = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)[0][0];

  return {
    totalSpending,
    averageTransaction: totalSpending / transactions.length,
    busiestDay,
    topCategory,
    dailySpending,
    categoryBreakdown
  };
}

export const analyzeTransactions = (transactions: Transaction[]): AnalyticsResult => {
  const consolidatedLocations: Record<string, number> = {};
  const timeDistribution: Record<string, { count: number; totalSpent: number }> = {};
  let totalActualCost = 0;
  let wastedDiscountOpportunities = 0;

  transactions.forEach(t => {
    const consolidatedLoc = consolidateLocation(t.location);
    const actualCost = calculateActualCost(t);
    const hour = t.timestamp.toDate().getHours();
    
    consolidatedLocations[consolidatedLoc] = (consolidatedLocations[consolidatedLoc] || 0) + 
      Math.abs(t.amount);

    if (!timeDistribution[hour]) {
      timeDistribution[hour] = { count: 0, totalSpent: 0 };
    }
    timeDistribution[hour].count++;
    timeDistribution[hour].totalSpent += Math.abs(t.amount);

    totalActualCost += actualCost;
    if (t.accountType === 'CampusMealPlan' && 
        (t.location.toLowerCase().includes('market') || 
         t.location.toLowerCase().includes('hub'))) {
      wastedDiscountOpportunities += Math.abs(t.amount);
    }
  });

  const mealPlanTransactions = transactions.filter(t => t.accountType === 'CampusMealPlan');
  const mealPlanSpent = mealPlanTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const mealPlanEfficiency = (mealPlanSpent > 0) 
    ? (mealPlanSpent * (1 - DISCOUNT_CONFIG.mealPlan.regular)) / DISCOUNT_CONFIG.mealPlanCost 
    : 0;

  const basicAnalytics = generateBasicAnalytics(transactions);
  const mealPreferences = analyzeMealPreferences(transactions);

  return {
    ...basicAnalytics,
    consolidatedLocations,
    timeDistribution,
    monthlyTrends: {},  // Implement if needed
    hourlyAnalysis: {},  // Implement if needed
    mealPreferences,
    discountAnalysis: {
      actualSpent: transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      potentialCost: totalActualCost,
      totalSaved: totalActualCost - transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
      wastedDiscountOpportunities,
      mealPlanEfficiency
    },
    recommendations: generateRecommendations(basicAnalytics, wastedDiscountOpportunities, mealPlanEfficiency)
  };
};

function generateRecommendations(
  analytics: BasicAnalytics,
  wastedDiscountOpportunities: number,
  mealPlanEfficiency: number
): string[] {
  const recommendations: string[] = [];

  if (wastedDiscountOpportunities > 100) {
    recommendations.push(
      `You've spent $${wastedDiscountOpportunities.toFixed(2)} of meal plan funds without discounts. ` +
      `Consider using these funds at dining commons or restaurants for better value.`
    );
  }

  if (mealPlanEfficiency < 0.7) {
    recommendations.push(
      `Your meal plan usage efficiency is ${(mealPlanEfficiency * 100).toFixed(1)}%. ` +
      `Try to maximize value by using it at locations offering the 65% discount.`
    );
  }

  const highestSpendingDay = analytics.busiestDay;
  recommendations.push(
    `Your highest spending occurs on ${highestSpendingDay}s. Consider planning meals ahead on these days.`
  );

  return recommendations;
}

export const getAnalytics = async (psuEmail: string): Promise<AnalyticsResult> => {
  try {
    const db = getFirestore();
    const transactionsRef = db.collection(`users/${psuEmail}/transactions`);
    const snapshot = await transactionsRef.get();
    
    const transactions: Transaction[] = snapshot.docs.map(doc => doc.data() as Transaction);
    
    if (!transactions.length) {
      return {
        totalSpending: 0,
        averageTransaction: 0,
        busiestDay: 'N/A',
        topCategory: 'N/A',
        dailySpending: {},
        categoryBreakdown: {},
        consolidatedLocations: {},
        timeDistribution: {},
        monthlyTrends: {},
        hourlyAnalysis: {},
        mealPreferences: {
          breakfast: [],
          lunch: [],
          dinner: [],
          lateNight: []
        },
        discountAnalysis: {
          actualSpent: 0,
          potentialCost: 0,
          totalSaved: 0,
          wastedDiscountOpportunities: 0,
          mealPlanEfficiency: 0
        },
        recommendations: ['No transaction data available']
      };
    }

    return analyzeTransactions(transactions);
  } catch (error) {
    console.error('Error getting analytics:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get analytics');
  }
};