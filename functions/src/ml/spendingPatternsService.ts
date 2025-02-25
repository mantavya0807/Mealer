// functions/src/ml/spendingPatternsService.ts
import { getFirestore } from 'firebase-admin/firestore';
import { SpendingPatternPredictor } from './spendingPatternPredictor';

// Initialize a singleton instance of the predictor
let patternPredictor: SpendingPatternPredictor | null = null;

interface SpendingPredictionRequest {
  user_id: string;
  current_balance: number;
  transactions?: any[];
  prediction_date?: string;
}

interface LocationPredictionRequest {
  user_id: string;
  time_of_day: string;
  day_of_week?: number;
  date?: string;
  transactions?: any[];
}

/**
 * Get or initialize the spending pattern predictor
 */
const getPredictor = (): SpendingPatternPredictor => {
  if (!patternPredictor) {
    console.log('Initializing spending pattern predictor...');
    patternPredictor = new SpendingPatternPredictor();
    console.log('Spending pattern predictor initialized');
  }
  return patternPredictor;
};

/**
 * Get user transactions from Firestore
 */
const getUserTransactions = async (userId: string, limit: number = 300) => {
  try {
    const db = getFirestore();
    const transactionsRef = db.collection(`users/${userId}/transactions`);
    const snapshot = await transactionsRef.orderBy('timestamp', 'desc').limit(limit).get();
    
    if (snapshot.empty) {
      console.log(`No transactions found for user ${userId}`);
      return [];
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        // Convert Firestore timestamps to JS Date
        timestamp: data.timestamp?.toDate() || new Date()
      };
    });
  } catch (error) {
    console.error(`Error fetching transactions for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Predict funds depletion and spending patterns
 */
export const predictSpendingPatterns = async (req: SpendingPredictionRequest) => {
  try {
    console.log(`Predicting spending patterns for user ${req.user_id}`);
    const { user_id, current_balance, transactions, prediction_date } = req;
    
    // Use provided transactions or fetch from Firestore
    let userTransactions = transactions;
    if (!userTransactions || userTransactions.length === 0) {
      console.log(`No transactions provided. Fetching from Firestore for user ${user_id}`);
      userTransactions = await getUserTransactions(user_id);
    }
    
    if (!userTransactions || userTransactions.length === 0) {
      console.log(`No transactions found for user ${user_id}`);
      return {
        error: 'No transaction data available for prediction',
        recommendations: [
          'Start using your meal plan to generate transaction data for predictions',
          'Visit dining commons to take advantage of the 65% discount',
          'Track your spending to establish personalized predictions'
        ]
      };
    }
    
    // Get current date or use provided date
    const predictionDate = prediction_date ? new Date(prediction_date) : new Date();
    
    // Get predictor instance
    const predictor = getPredictor();
    
    // Train models for this user
    try {
      predictor.fit_daily_spending_model(userTransactions);
      predictor.fit_funds_depletion_model(userTransactions, current_balance);
      predictor.fit_location_preference_model(userTransactions);
    } catch (error) {
      console.error(`Error training models for user ${user_id}:`, error);
      // Continue with predictions using fallback methods
    }
    
    // Get predictions
    const depletion = predictor.predict_funds_depletion(current_balance, predictionDate);
    const weeklySpending = predictor.predict_weekly_spending(predictionDate);
    const patterns = predictor.analyze_spending_patterns(userTransactions);
    
    return {
      funds_depletion: depletion,
      weekly_spending: weeklySpending,
      spending_patterns: patterns
    };
  } catch (error) {
    console.error('Error predicting spending patterns:', error);
    throw error;
  }
};

/**
 * Predict preferred dining locations
 */
export const predictDiningLocations = async (req: LocationPredictionRequest) => {
  try {
    console.log(`Predicting dining locations for user ${req.user_id}`);
    const { user_id, time_of_day, day_of_week, date, transactions } = req;
    
    // Use provided transactions or fetch from Firestore
    let userTransactions = transactions;
    if (!userTransactions || userTransactions.length === 0) {
      console.log(`No transactions provided. Fetching from Firestore for user ${user_id}`);
      userTransactions = await getUserTransactions(user_id);
    }
    
    if (!userTransactions || userTransactions.length === 0) {
      console.log(`No transactions found for user ${user_id}`);
      return {
        error: 'No transaction data available for prediction',
        generic_recommendations: [
          { location: 'Findlay Commons', reason: 'Popular dining commons with 65% discount' },
          { location: 'North Food District', reason: 'Wide variety of options with 65% discount' },
          { location: 'Redifer Commons', reason: 'Great selection with 65% discount' }
        ]
      };
    }
    
    // Get current date/day or use provided values
    const predictionDate = date ? new Date(date) : new Date();
    const predictionDay = day_of_week !== undefined ? day_of_week : predictionDate.getDay();
    
    // Get predictor instance
    const predictor = getPredictor();
    
    // Train location model for this user
    try {
      predictor.fit_location_preference_model(userTransactions);
    } catch (error) {
      console.error(`Error training location model for user ${user_id}:`, error);
      // Return generic recommendations
      return {
        error: 'Unable to train prediction model',
        generic_recommendations: [
          { location: 'Findlay Commons', reason: 'Popular dining commons with 65% discount' },
          { location: 'North Food District', reason: 'Wide variety of options with 65% discount' },
          { location: 'Redifer Commons', reason: 'Great selection with 65% discount' }
        ]
      };
    }
    
    // Get location predictions
    const predictions = predictor.predict_location_preferences(time_of_day, predictionDay, predictionDate);
    
    return {
      preferred_locations: predictions,
      time_of_day,
      day_of_week: predictionDay,
      date: predictionDate.toISOString()
    };
  } catch (error) {
    console.error('Error predicting dining locations:', error);
    throw error;
  }
};