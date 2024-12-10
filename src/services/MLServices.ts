import axios from 'axios';

interface Transaction {
  accountType: 'LionCash' | 'CampusMealPlan';
  amount: number;
  location: string;
  timestamp: Date;
  category?: string;
  subcategory?: string;
  transactionType?: string;
}

interface PredictionResponse {
  predicted_empty_date: string;
  days_remaining: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  daily_spending_pattern: Record<string, number>;
  recommended_daily_budget: number;
}

export const MLService = {
    getPredictions: async (
      transactions: Transaction[],
      currentBalance: number,
      mealPlanType: string
    ): Promise<PredictionResponse> => {
      try {
        // Format transactions to ensure timestamps are strings
        const formattedTransactions = transactions.map(t => ({
          ...t,
          timestamp: t.timestamp instanceof Date 
            ? t.timestamp.toISOString() 
            : new Date(t.timestamp).toISOString(),
          amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
        }));
  
        const response = await axios.post(
          'http://localhost:5001/meal-plan-optimizer/us-central1/api/ml/predictions',
          {
            transactions: formattedTransactions,
            currentBalance: currentBalance,
            mealPlanType
          }
        );
  
        return response.data;
    } catch (error) {
      console.error('ML Service Error:', {
        error,
        message: error.message,
        response: error.response?.data
      });

      // Provide more specific error messages
      if (error.response?.status === 500) {
        throw new Error('Server error in predictions service. Please try again later.');
      }

      throw error;
    }
  }
};