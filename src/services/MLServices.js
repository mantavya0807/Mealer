const axios = require('axios/dist/node/axios.cjs');

// Utility service for calling the backend ML endpoints. This file was originally
// written in TypeScript but the project is configured for plain JavaScript,
// which caused build failures. The type annotations have been removed so the
// file can be consumed by Create React App without additional tooling.

export const MLService = {
  /**
   * Request spending predictions from the backend. If the request fails,
   * a simplified prediction will be generated locally based on the
   * provided transactions.
   * @param {Array<Object>} transactions Array of transaction objects
   * @param {number} currentBalance Current meal plan balance
   * @param {string} mealPlanType Type of meal plan the user has
   */
  async getPredictions(transactions, currentBalance, mealPlanType) {
    try {
      const formattedTransactions = transactions.map(t => ({
        ...t,
        timestamp: t.timestamp instanceof Date
          ? t.timestamp.toISOString()
          : new Date(t.timestamp).toISOString(),
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount
      }));

      const response = await axios.post(
        'http://localhost:5000/api/ml/predictions',
        {
          transactions: formattedTransactions,
          currentBalance,
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

      // Fall back to a local heuristic if the backend is unavailable
      return this.generateLocalPredictions(transactions, currentBalance);
    }
  },

  /**
   * Generate simple spending predictions locally using historical averages.
   */
  generateLocalPredictions(transactions, currentBalance) {
    if (!transactions || transactions.length === 0) {
      return null;
    }

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const totalsByDay = {};
    const totalsByDOW = Array(7).fill(0);
    const countsByDOW = Array(7).fill(0);

    transactions.forEach(t => {
      const ts = new Date(t.timestamp);
      const dayKey = ts.toISOString().slice(0, 10);
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount || 0;
      totalsByDay[dayKey] = (totalsByDay[dayKey] || 0) + amount;
      const dow = ts.getDay();
      totalsByDOW[dow] += amount;
      countsByDOW[dow] += 1;
    });

    const dailyTotals = Object.values(totalsByDay);
    const avgDaily = dailyTotals.reduce((a, b) => a + b, 0) / (dailyTotals.length || 1);

    const today = new Date();
    const daysRemaining = avgDaily > 0 ? currentBalance / avgDaily : 0;
    const predictedDate = new Date(today.getTime() + daysRemaining * 86400000);

    const semesterEnd = new Date(today.getFullYear(), today.getMonth() >= 7 ? 11 : 4, 15);
    const daysToSemesterEnd = (semesterEnd.getTime() - today.getTime()) / 86400000;
    const recommendedDailyBudget = daysToSemesterEnd > 0 ? currentBalance / daysToSemesterEnd : 0;
    const risk_level = daysRemaining < daysToSemesterEnd * 0.5 ? 'HIGH'
      : daysRemaining < daysToSemesterEnd ? 'MEDIUM' : 'LOW';

    const daily_spending_pattern = {};
    DAYS.forEach((day, idx) => {
      daily_spending_pattern[day] = countsByDOW[idx] > 0
        ? totalsByDOW[idx] / countsByDOW[idx]
        : 0;
    });

    return {
      predicted_empty_date: predictedDate.toISOString(),
      days_remaining: daysRemaining,
      risk_level,
      daily_spending_pattern,
      recommended_daily_budget: recommendedDailyBudget
    };
  },

  /**
   * Generate simple meal recommendations based on most visited locations.
   */
  generateLocalRecommendations(transactions, preferences = {}, discountOnly = false) {
    const MEAL_TIMES = {
      breakfast: { start: 6, end: 10 },
      lunch: { start: 11, end: 14 },
      dinner: { start: 17, end: 21 },
      late_night: { start: 21, end: 24 }
    };

    const buckets = {
      breakfast: {},
      lunch: {},
      dinner: {},
      late_night: {}
    };

    transactions.forEach(t => {
      const ts = new Date(t.timestamp);
      const hour = ts.getHours();
      const location = t.location || 'Unknown';

      let meal = 'late_night';
      if (hour >= MEAL_TIMES.breakfast.start && hour < MEAL_TIMES.breakfast.end) meal = 'breakfast';
      else if (hour >= MEAL_TIMES.lunch.start && hour < MEAL_TIMES.lunch.end) meal = 'lunch';
      else if (hour >= MEAL_TIMES.dinner.start && hour < MEAL_TIMES.dinner.end) meal = 'dinner';

      buckets[meal][location] = (buckets[meal][location] || 0) + 1;
    });

    const buildList = (obj) => Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => ({
        name,
        area: '',
        category: '',
        meal_plan_discount: !discountOnly ? false : true,
        dietary_options: [],
        avg_wait_time: 0,
        explanation: 'Recommended based on your past visits.'
      }));

    return {
      breakfast: buildList(buckets.breakfast),
      lunch: buildList(buckets.lunch),
      dinner: buildList(buckets.dinner),
      late_night: buildList(buckets.late_night)
    };
  }
};
