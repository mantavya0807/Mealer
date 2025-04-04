// functions/src/ml/spendingPatternsService.ts
import { getFirestore } from 'firebase-admin/firestore';
import { spawn } from 'child_process';
import * as path from 'path';

// Define an interface for the predictor with Promise return types
interface SpendingPatternPredictor {
  fit_daily_spending_model(transactions: any[]): Promise<void>;
  fit_funds_depletion_model(transactions: any[], currentBalance: number): Promise<void>;
  fit_location_preference_model(transactions: any[]): Promise<void>;
  predict_funds_depletion(currentBalance: number, date: Date): Promise<any>;
  predict_weekly_spending(date: Date): Promise<any[]>;
  analyze_spending_patterns(transactions: any[]): Promise<any>;
  predict_location_preferences(timeOfDay: string, dayOfWeek: number, date: Date): Promise<any[]>;
}

// Initialize a singleton instance of the predictor wrapper
let patternPredictor: SpendingPatternPredictorWrapper | null = null;

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

// Create a wrapper class that will execute Python code
class SpendingPatternPredictorWrapper implements SpendingPatternPredictor {
  private pythonScriptPath: string;

  constructor() {
    // Path to your Python script
    this.pythonScriptPath = path.join(__dirname, 'spendingPatternPredictor.py');
    console.log('Python script path:', this.pythonScriptPath);
  }

  // Helper method to run Python with data
  private async runPythonMethod(method: string, args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const process = spawn('python', [
        this.pythonScriptPath,
        method,
        JSON.stringify(args)
      ]);

      let result = '';
      let error = '';

      process.stdout.on('data', (data) => {
        result += data.toString();
      });

      process.stderr.on('data', (data) => {
        error += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}: ${error}`);
          reject(new Error(`Python error: ${error}`));
          return;
        }

        try {
          resolve(JSON.parse(result));
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${result}`));
        }
      });
    });
  }

  // Implement the interface methods using Python calls
  async fit_daily_spending_model(transactions: any[]): Promise<void> {
    await this.runPythonMethod('fit_daily_spending_model', [transactions]);
  }

  async fit_funds_depletion_model(transactions: any[], currentBalance: number): Promise<void> {
    await this.runPythonMethod('fit_funds_depletion_model', [transactions, currentBalance]);
  }

  async fit_location_preference_model(transactions: any[]): Promise<void> {
    await this.runPythonMethod('fit_location_preference_model', [transactions]);
  }

  async predict_funds_depletion(currentBalance: number, date: Date): Promise<any> {
    return this.runPythonMethod('predict_funds_depletion', [currentBalance, date.toISOString()]);
  }

  async predict_weekly_spending(date: Date): Promise<any[]> {
    return this.runPythonMethod('predict_weekly_spending', [date.toISOString()]);
  }

  async analyze_spending_patterns(transactions: any[]): Promise<any> {
    return this.runPythonMethod('analyze_spending_patterns', [transactions]);
  }

  async predict_location_preferences(timeOfDay: string, dayOfWeek: number, date: Date): Promise<any[]> {
    return this.runPythonMethod('predict_location_preferences', [timeOfDay, dayOfWeek, date.toISOString()]);
  }
}

/**
 * Get or initialize the spending pattern predictor
 */
const getPredictor = (): SpendingPatternPredictorWrapper => {
  if (!patternPredictor) {
    console.log('Initializing spending pattern predictor...');
    patternPredictor = new SpendingPatternPredictorWrapper();
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
      await predictor.fit_daily_spending_model(userTransactions);
      await predictor.fit_funds_depletion_model(userTransactions, current_balance);
      await predictor.fit_location_preference_model(userTransactions);
    } catch (error) {
      console.error(`Error training models for user ${user_id}:`, error);
      // Continue with predictions using fallback methods
    }
    
    // Get predictions
    const depletion = await predictor.predict_funds_depletion(current_balance, predictionDate);
    const weeklySpending = await predictor.predict_weekly_spending(predictionDate);
    const patterns = await predictor.analyze_spending_patterns(userTransactions);
    
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
      await predictor.fit_location_preference_model(userTransactions);
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
    const predictions = await predictor.predict_location_preferences(time_of_day, predictionDay, predictionDate);
    
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