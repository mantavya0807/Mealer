// src/services/mlService.js
import axios from 'axios';

export const MLService = {
    async getPredictions(transactions, currentBalance, mealPlanType) {
        try {
            const response = await axios.post('/api/ml/predictions', {
                transactions,
                currentBalance,
                mealPlanType
            });
            return response.data;
        } catch (error) {
            console.error('Error getting predictions:', error);
            throw error;
        }
    },

    async getMealPlanRecommendation(transactions, currentMealPlan) {
        try {
            const response = await axios.post('/api/ml/meal-plan-recommendation', {
                transactions,
                currentMealPlan
            });
            return response.data;
        } catch (error) {
            console.error('Error getting meal plan recommendation:', error);
            throw error;
        }
    },

    async getBestTimes(transactions) {
        try {
            const response = await axios.post('/api/ml/best-times', {
                transactions
            });
            return response.data;
        } catch (error) {
            console.error('Error getting best times:', error);
            throw error;
        }
    }
};