// functions/src/ml/mealRecommendationService.ts
import { getFirestore } from 'firebase-admin/firestore';
import { MealRecommendationSystem } from './mealRecommendationSystem';

// Initialize the recommendation system as a singleton
let recommendationSystem: MealRecommendationSystem | null = null;

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
const getRecommendationSystem = (): MealRecommendationSystem => {
  if (!recommendationSystem) {
    console.log('Initializing meal recommendation system...');
    recommendationSystem = new MealRecommendationSystem();
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
    recommender.update_user_profile(user_id, userTransactions, userPreferences);
    
    // Generate recommendations for the day
    const recommendationDate = date ? new Date(date) : new Date();
    const recommendations = recommender.batch_recommendations_for_day(
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