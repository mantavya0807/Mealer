// functions/src/analytics/transactionAnalytics.ts

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

interface AnalyticsResult {
  totalSpending: number;
  averageTransaction: number;
  busiestDay: string;
  topCategory: string;
  dailySpending: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  timeDistribution: Record<string, number>;
  monthlyTrends: Record<string, number>;
  recommendations: string[];
}

export const analyzeTransactions = (transactions: Transaction[]): AnalyticsResult => {
  const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const averageTransaction = totalSpending / transactions.length;

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

  const locationBreakdown = transactions.reduce((acc, t) => {
    acc[t.location] = (acc[t.location] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const timeDistribution = transactions.reduce((acc, t) => {
    const hour = t.timestamp.toDate().getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyTrends = transactions.reduce((acc, t) => {
    const monthYear = t.timestamp.toDate().toISOString().slice(0, 7);
    acc[monthYear] = (acc[monthYear] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);

  const busiestDay = Object.entries(dailySpending)
    .sort(([,a], [,b]) => b - a)[0][0];
  const topCategory = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a)[0][0];

  const recommendations = generateRecommendations({
    dailySpending,
    categoryBreakdown,
    timeDistribution,
    averageTransaction
  });

  return {
    totalSpending,
    averageTransaction,
    busiestDay,
    topCategory,
    dailySpending,
    categoryBreakdown,
    locationBreakdown,
    timeDistribution,
    monthlyTrends,
    recommendations
  };
};

function generateRecommendations({
  dailySpending,
  categoryBreakdown,
  timeDistribution,
  averageTransaction
}: {
  dailySpending: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  timeDistribution: Record<string, number>;
  averageTransaction: number;
}): string[] {
  const recommendations: string[] = [];

  const highestSpendingDay = Object.entries(dailySpending)
    .sort(([,a], [,b]) => b - a)[0][0];
  recommendations.push(`Consider reducing spending on ${highestSpendingDay}s as it's your highest spending day.`);

  const categoryEntries = Object.entries(categoryBreakdown)
    .sort(([,a], [,b]) => b - a);
  const topCategory = categoryEntries[0][0];
  recommendations.push(`Your highest spending category is ${topCategory}. Consider setting a budget for this category.`);

  const peakHour = Object.entries(timeDistribution)
    .sort(([,a], [,b]) => b - a)[0][0];
  recommendations.push(`You frequently make purchases around ${peakHour}:00. Consider planning meals ahead to avoid impulse purchases.`);

  if (averageTransaction > 20) {
    recommendations.push('Your average transaction is relatively high. Consider making smaller, more frequent purchases.');
  }

  return recommendations;
}

export const getAnalytics = async (psuEmail: string): Promise<AnalyticsResult> => {
  try {
    const db = getFirestore();
    const transactionsRef = db.collection(`users/${psuEmail}/transactions`);
    const snapshot = await transactionsRef.get();
    
    const transactions: Transaction[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        accountType: data.accountType,
        amount: data.amount,
        cardNumber: data.cardNumber,
        category: data.category,
        location: data.location,
        subcategory: data.subcategory,
        timestamp: data.timestamp,
        transactionType: data.transactionType,
        createdAt: data.createdAt
      };
    });

    if (!transactions.length) {
      return {
        totalSpending: 0,
        averageTransaction: 0,
        busiestDay: 'N/A',
        topCategory: 'N/A',
        dailySpending: {},
        categoryBreakdown: {},
        locationBreakdown: {},
        timeDistribution: {},
        monthlyTrends: {},
        recommendations: ['No transaction data available']
      };
    }

    return analyzeTransactions(transactions);
  } catch (error) {
    console.error('Error getting analytics:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get analytics');
  }
};