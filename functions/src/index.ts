// functions/src/index.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { initiatePSULogin } from './scraper/pennStateScraper.js';
import { processAndUploadTransactions } from './dataProcessor/transactionProcessor.js';
import { logSearch, getSearchHistory, getSearchDetails } from './searchHistory/searchHistoryHandler.js';
import { getAnalytics } from './analytics/transactionAnalytics.js';
import { Timestamp } from 'firebase-admin/firestore';
import { getMealRecommendations } from './ml/mealRecommendationService.js';
import { predictSpendingPatterns } from './ml/spendingPatternsService.js';
import { getMealPlanAssistance } from './ml/mealPlanAssistant.js';

// Interfaces
interface Transaction {
  accountType: 'LionCash' | 'CampusMealPlan';
  amount: number;
  cardNumber: string;
  category: string;
  createdAt: Timestamp;
  location: string;
  subcategory: string;
  timestamp: Timestamp;
  transactionType: string;
}

interface DateRange {
  from: string;
  to: string;
}

interface Search {
  id: string;
  psuEmail: string;
  dateRange: DateRange;
  timestamp: Timestamp;
  transactionCount: number;
  transactions: Transaction[];
}

interface LoginRequest {
  psuEmail: string;
  password: string;
  verificationCode: string;
  fromDate: string;
  toDate: string;
}

interface MLPredictionRequest {
  transactions: Transaction[];
  currentBalance: number;
  mealPlanType: string;
}

interface MLRecommendationRequest {
  transactions: Transaction[];
  currentMealPlan: string;
}

interface LocationData {
  hourly_visits: number[];
  daily_visits: Record<string, number>;
  total_visits: number;
}

interface ProcessedLocationData {
  peak_hours: number[];
  quiet_hours: number[];
  best_days: string[];
  hourly_busyness: number[];
}

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// Login and data fetching endpoint
app.post('/login', async (req: Request<any, any, LoginRequest>, res: Response) => {
  try {
    const { psuEmail, password, verificationCode, fromDate, toDate } = req.body;

    // Validate required fields
    if (!psuEmail || !password || !verificationCode || !fromDate || !toDate) {
      return res.status(400).json({
        error: "Fill in all required fields",
      });
    }

    console.log('Starting login process for:', psuEmail);
    const result = await initiatePSULogin(psuEmail, password, verificationCode, fromDate, toDate);

    if (result.success && result.csvData) {
      try {
        // Process and upload transactions
        const processResult = await processAndUploadTransactions(result.csvData, psuEmail);
        
        if (processResult.success) {
          // Log the search
          const searchId = await logSearch(psuEmail, { from: fromDate, to: toDate });
          
          // Get analytics for the newly processed data
          const analytics = await getAnalytics(psuEmail);
          
          return res.json({
            success: true,
            message: 'Login successful and transactions processed',
            searchId,
            transactionCount: processResult.transactionCount,
            analytics // Include analytics in the response
          });
        }
        
        return res.status(500).json({
          success: false,
          error: 'Login successful but failed to process transactions',
          details: processResult.error
        });
      } catch (processError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to process transactions',
          details: processError instanceof Error ? processError.message : 'Unknown error'
        });
      }
    }

    return res.json({
      success: true,
      message: 'Login successful but no transaction data found'
    });

  } catch (error) {
    console.error('Server error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid email')) {
        return res.status(400).json({
          error: 'Invalid email address',
          details: error.message
        });
      }
      
      return res.status(500).json({
        error: 'Failed to process login request',
        details: error.message
      });
    }
    
    return res.status(500).json({
      error: 'Failed to process login request',
      details: 'Unknown error occurred'
    });
  }
});

// Get all searches
app.get('/searches', async (_req: Request, res: Response) => {
  try {
    const searches = await getSearchHistory();
    
    const formattedSearches = searches.map((search: Search) => ({
      id: search.id,
      psuEmail: search.psuEmail,
      dateRange: search.dateRange,
      timestamp: search.timestamp.toDate(),
      transactionCount: search.transactionCount,
      hasTransactions: search.transactions?.length > 0
    }));

    return res.json({ searches: formattedSearches });
  } catch (error) {
    console.error('Error fetching searches:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch searches',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific search details
app.get('/searches/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Search ID is required' });
    }

    const search = await getSearchDetails(id);
    if (!search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    const formattedSearch = {
      ...search,
      timestamp: search.timestamp.toDate(),
      transactions: search.transactions.map((t: Transaction) => ({
        ...t,
        timestamp: t.timestamp.toDate(),
        createdAt: t.createdAt.toDate(),
      })),
    };

    return res.json(formattedSearch);
  } catch (error) {
    console.error('Error fetching search details:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch search details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get analytics for a specific email
app.get('/analytics/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const analytics = await getAnalytics(email);
    
    // Add validation for the analytics result
    if (!analytics) {
      return res.status(404).json({ 
        error: 'No analytics data found',
        details: `No data available for ${email}`
      });
    }

    // Add debug logging
    console.log('Analytics response for', email, ':', JSON.stringify(analytics, null, 2));

    return res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get analytics for multiple emails
app.post('/analytics/compare', async (req: Request, res: Response) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Array of emails is required' });
    }

    const analyticsPromises = emails.map(email => getAnalytics(email));
    const analyticsResults = await Promise.all(analyticsPromises);

    const comparativeAnalytics = emails.reduce((acc, email, index) => {
      acc[email] = analyticsResults[index];
      return acc;
    }, {} as Record<string, any>);

    return res.json(comparativeAnalytics);
  } catch (error) {
    console.error('Error fetching comparative analytics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch comparative analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Meal Plan Recommendations endpoint
app.post('/ml/meal-plan-recommendation', async (req: Request<any, any, MLRecommendationRequest>, res: Response) => {
  try {
    const { transactions, currentMealPlan } = req.body;
    
    if (!transactions || !currentMealPlan) {
      return res.status(400).json({
        error: "Missing required parameters",
        details: "transactions and currentMealPlan are required"
      });
    }

    const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgTransaction = totalSpent / transactions.length;
    const weeklySpending = totalSpent / 15; // assuming 15 weeks

    const mealPlans = {
      level_1: { cost: 2000, value: 2200 },
      level_2: { cost: 2800, value: 3200 },
      level_3: { cost: 3500, value: 4200 }
    };

    // Simple recommendation logic
    let recommendedPlan = 'level_1';
    if (weeklySpending > 250) recommendedPlan = 'level_3';
    else if (weeklySpending > 150) recommendedPlan = 'level_2';

    return res.json({
      recommended_plan: recommendedPlan,
      current_spending_pattern: {
        weekly_average: weeklySpending,
        projected_semester: weeklySpending * 15,
        avg_transaction: avgTransaction
      },
      potential_savings: mealPlans[recommendedPlan as keyof typeof mealPlans].value - mealPlans[recommendedPlan as keyof typeof mealPlans].cost
    });
  } catch (error) {
    console.error('Error generating meal plan recommendation:', error);
    return res.status(500).json({
      error: 'Failed to generate meal plan recommendation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Best Times endpoint
app.post('/ml/best-times', async (req: Request, res: Response) => {
  try {
    const { transactions } = req.body;
    
    if (!transactions) {
      return res.status(400).json({
        error: "Missing required parameters",
        details: "transactions are required"
      });
    }

    // Group transactions by location and hour
    const locationTimes = transactions.reduce((acc: Record<string, any>, t: Transaction) => {
      const location = t.location;
      const hour = t.timestamp.toDate().getHours();
      const day = t.timestamp.toDate().toLocaleDateString('en-US', { weekday: 'long' });

      if (!acc[location]) {
        acc[location] = {
          hourly_visits: Array(24).fill(0),
          daily_visits: {},
          total_visits: 0
        };
      }

      acc[location].hourly_visits[hour]++;
      acc[location].daily_visits[day] = (acc[location].daily_visits[day] || 0) + 1;
      acc[location].total_visits++;

      return acc;
    }, {});

    const bestTimes = Object.entries(locationTimes).reduce<Record<string, ProcessedLocationData>>((acc, [location, data]) => {
      const typedData = data as LocationData;
      const hourlyData = typedData.hourly_visits;
      const dailyData = typedData.daily_visits;
  
      // Find peak and quiet hours
      const peakHours = Array.from(hourlyData.entries())
          .map(([hour, visits]) => ({ hour, visits }))
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 3)
          .map(item => item.hour);
  
      const quietHours = Array.from(hourlyData.entries())
          .map(([hour, visits]) => ({ hour, visits }))
          .filter(item => item.visits > 0)
          .sort((a, b) => a.visits - b.visits)
          .slice(0, 3)
          .map(item => item.hour);
  
      acc[location] = {
          peak_hours: peakHours,
          quiet_hours: quietHours,
          best_days: Object.entries(dailyData)
              .sort(([, a], [, b]) => (a as number) - (b as number))
              .slice(0, 3)
              .map(([day]) => day),
          hourly_busyness: hourlyData.map(visits => 
              visits / typedData.total_visits
          )
      };
  
      return acc;
  }, {});
    return res.json(bestTimes);
  } catch (error) {
    console.error('Error generating best times:', error);
    return res.status(500).json({
      error: 'Failed to generate best times',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// In your index.js (backend)
app.post('/ml/predictions', async (req: Request<any, any, MLPredictionRequest>, res: Response) => {
  try {
    const { transactions, currentBalance, mealPlanType } = req.body;
    
    if (!transactions || currentBalance === undefined || !mealPlanType) {
      return res.status(400).json({
        error: "Missing required parameters",
        details: "transactions, currentBalance, and mealPlanType are required"
      });
    }

    // Helper function to safely get Date object from timestamp
    const getDateFromTimestamp = (timestamp: any): Date => {
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'string') return new Date(timestamp);
      if (timestamp?.toDate instanceof Function) return timestamp.toDate();
      if (timestamp?._seconds) return new Date(timestamp._seconds * 1000);
      return new Date(timestamp);
    };

    // Calculate predictions based on transaction history
    const totalSpent = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const avgDailySpending = totalSpent / 30; // assuming 30 days of data
    const daysRemaining = currentBalance / avgDailySpending;
    
    // Calculate predicted empty date
    const predictedEmptyDate = new Date();
    predictedEmptyDate.setDate(predictedEmptyDate.getDate() + Math.floor(daysRemaining));

    // Calculate daily spending pattern safely
    const dailySpending = transactions.reduce((acc: Record<string, number>, t) => {
      try {
        const date = getDateFromTimestamp(t.timestamp);
        const day = date.toLocaleDateString('en-US', { weekday: 'long' });
        acc[day] = (acc[day] || 0) + Math.abs(t.amount);
      } catch (err) {
        console.error('Error processing transaction:', t, err);
      }
      return acc;
    }, {});

    // Calculate risk level
    let risk_level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (daysRemaining < 30) {
      risk_level = 'HIGH';
    } else if (daysRemaining < 60) {
      risk_level = 'MEDIUM';
    }

    // Calculate recommended daily budget
    const semesterDaysRemaining = 120; // approximately 4 months
    const recommendedDailyBudget = currentBalance / semesterDaysRemaining;

    return res.json({
      predicted_empty_date: predictedEmptyDate.toISOString(),
      days_remaining: daysRemaining,
      risk_level,
      daily_spending_pattern: dailySpending,
      recommended_daily_budget: recommendedDailyBudget
    });

  } catch (error) {
    console.error('Error generating predictions:', error);
    return res.status(500).json({
      error: 'Failed to generate predictions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
// ML Endpoints
app.post('/ml/meal-recommendations', async (req, res) => {
  try {
    const result = await getMealRecommendations(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error getting meal recommendations:', error);
    res.status(500).json({ error: 'Failed to get meal recommendations' });
  }
});

app.post('/ml/spending-predictions', async (req, res) => {
  try {
    const result = await predictSpendingPatterns(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error predicting spending patterns:', error);
    res.status(500).json({ error: 'Failed to predict spending patterns' });
  }
});

app.post('/ml/assistant', async (req, res) => {
  try {
    const result = await getMealPlanAssistance(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error getting meal plan assistance:', error);
    res.status(500).json({ error: 'Failed to get meal plan assistance' });
  }
});

// Export the api
export const api = onRequest({
  timeoutSeconds: 540, // 9 minutes
  region: 'us-central1',
  minInstances: 0,
  maxInstances: 100,
}, app);