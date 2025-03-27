// functions/src/ml/mealRecommendationService.ts
import { getFirestore } from 'firebase-admin/firestore';
import { spawn } from 'child_process';
import * as path from 'path';

// Define an interface for the MealRecommendationSystem
interface MealRecommendationSystem {
  fit(): void;
  update_user_profile(userId: string, transactions: any[], preferences: any): void;
  batch_recommendations_for_day(userId: string, date: Date, dietaryPreferences?: string[], discountOnly?: boolean): any;
}

// Create a wrapper class for the Python implementation
class MealRecommendationSystemWrapper implements MealRecommendationSystem {
  private pythonScriptPath: string;

  constructor() {
    // Path to your Python script
    this.pythonScriptPath = path.join(__dirname, 'mealRecommendationSystem.py');
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

  async fit(): Promise<void> {
    await this.runPythonMethod('fit', []);
  }

  async update_user_profile(userId: string, transactions: any[], preferences: any): Promise<void> {
    await this.runPythonMethod('update_user_profile', [userId, transactions, preferences]);
  }

  async batch_recommendations_for_day(
    userId: string, 
    date: Date, 
    dietaryPreferences?: string[], 
    discountOnly?: boolean
  ): Promise<any> {
    return this.runPythonMethod('batch_recommendations_for_day', [
      userId, 
      date.toISOString(), 
      dietaryPreferences || null, 
      !!discountOnly
    ]);
  }
}

// Initialize the recommendation system as a singleton
let recommendationSystem: MealRecommendationSystemWrapper | null = null;

interface Transaction {
  location: string;
  timestamp: string | Date;
  amount: number;
}

interface UserPreferences {
  dietary_preferences: string[];
  cuisines_preferred: string[];
  avoid_locations: string[];
}

interface MealRecommendationRequest {
  user_id: string;
  transactions?: Transaction[];
  preferences?: UserPreferences;
  discount_only?: boolean;
  date?: string;
}

/**
 * Get or initialize the meal recommendation system
 */
const getRecommendationSystem = (): MealRecommendationSystemWrapper => {
  if (!recommendationSystem) {
    console.log('Initializing meal recommendation system...');
    recommendationSystem = new MealRecommendationSystemWrapper();
    recommendationSystem.fit();
    console.log('Meal recommendation system initialized');
  }
  return recommendationSystem;
};

/**
 * Get meal recommendations for a user
 */
export const getMealRecommendations = async (req: MealRecommendationRequest) => {
  try {
    console.log('Getting meal recommendations for user:', req.user_id);

    const { user_id, transactions = [], preferences = null, discount_only = false, date } = req;
    
    // Initialize the recommendation system
    const recommender = getRecommendationSystem();
    
    // Get additional user data from Firestore if needed
    let userTransactions = [...transactions];
    
    if (!transactions || transactions.length === 0) {
      console.log('No transactions provided, fetching from Firestore...');
      try {
        const db = getFirestore();
        const transactionsRef = db.collection(`users/${user_id}/transactions`);
        const snapshot = await transactionsRef.limit(100).get();
        
        if (!snapshot.empty) {
          const firestoreTransactions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              location: data.location,
              timestamp: data.timestamp.toDate(),
              amount: data.amount
            };
          });
          
          userTransactions = [...firestoreTransactions];
          console.log(`Fetched ${userTransactions.length} transactions from Firestore`);
        }
      } catch (error) {
        console.error('Error fetching transactions from Firestore:', error);
      }
    }
    
    // Get user preferences from Firestore if not provided
    let userPreferences = preferences;
    
    if (!preferences) {
      console.log('No preferences provided, fetching from Firestore...');
      try {
        const db = getFirestore();
        const userDoc = await db.doc(`users/${user_id}`).get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          userPreferences = {
            dietary_preferences: userData?.dietaryRestrictions || [],
            cuisines_preferred: userData?.cuisinePreferences || [],
            avoid_locations: userData?.placesToAvoid || []
          };
          console.log('Fetched user preferences from Firestore');
        }
      } catch (error) {
        console.error('Error fetching user preferences from Firestore:', error);
      }
    }
    
    // Update the user profile in the recommendation system
    await recommender.update_user_profile(user_id, userTransactions, userPreferences);
    
    // Generate recommendations for the day
    const recommendationDate = date ? new Date(date) : new Date();
    const recommendations = await recommender.batch_recommendations_for_day(
      user_id,
      recommendationDate,
      userPreferences?.dietary_preferences,
      discount_only
    );
    
    return recommendations;
  } catch (error) {
    console.error('Error getting meal recommendations:', error);
    throw error;
  }
};