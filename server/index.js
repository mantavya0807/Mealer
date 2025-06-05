const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

function generateLocalPredictions(transactions, currentBalance) {
  if (!transactions || transactions.length === 0) {
    return null;
  }
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const totalsByDay = {};
  const totalsByDOW = Array(7).fill(0);
  const countsByDOW = Array(7).fill(0);

  transactions.forEach(t => {
    const ts = new Date(t.timestamp);
    const dayKey = ts.toISOString().slice(0,10);
    const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount || 0;
    totalsByDay[dayKey] = (totalsByDay[dayKey] || 0) + amount;
    const dow = ts.getDay();
    totalsByDOW[dow] += amount;
    countsByDOW[dow] += 1;
  });

  const dailyTotals = Object.values(totalsByDay);
  const avgDaily = dailyTotals.reduce((a,b)=>a+b,0) / (dailyTotals.length || 1);
  const today = new Date();
  const daysRemaining = avgDaily > 0 ? currentBalance / avgDaily : 0;
  const predictedDate = new Date(today.getTime() + daysRemaining * 86400000);
  const semesterEnd = new Date(today.getFullYear(), today.getMonth() >= 7 ? 11 : 4, 15);
  const daysToSemesterEnd = (semesterEnd - today) / 86400000;
  const recommendedDailyBudget = daysToSemesterEnd > 0 ? currentBalance / daysToSemesterEnd : 0;
  const risk_level = daysRemaining < daysToSemesterEnd * 0.5 ? 'HIGH' :
                     daysRemaining < daysToSemesterEnd ? 'MEDIUM' : 'LOW';
  const daily_spending_pattern = {};
  DAYS.forEach((day, idx) => {
    daily_spending_pattern[day] = countsByDOW[idx] > 0 ? totalsByDOW[idx] / countsByDOW[idx] : 0;
  });
  return {
    predicted_empty_date: predictedDate.toISOString(),
    days_remaining: daysRemaining,
    risk_level,
    daily_spending_pattern,
    recommended_daily_budget: recommendedDailyBudget
  };
}

function generateLocalRecommendations(transactions, preferences = {}, discountOnly = false) {
  const MEAL_TIMES = {
    breakfast: { start: 6, end: 10 },
    lunch: { start: 11, end: 14 },
    dinner: { start: 17, end: 21 },
    late_night: { start: 21, end: 24 }
  };
  const buckets = { breakfast: {}, lunch: {}, dinner: {}, late_night: {} };
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
  const buildList = obj => Object.entries(obj)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)
    .map(([name])=>({
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

app.post('/api/ml/predictions', (req, res) => {
  const { transactions, currentBalance } = req.body;
  if (!transactions || currentBalance === undefined) {
    return res.status(400).json({ error: 'transactions and currentBalance required' });
  }
  const result = generateLocalPredictions(transactions, Number(currentBalance));
  res.json(result);
});

app.post('/api/ml/meal-recommendations', (req, res) => {
  const { transactions, preferences, discountOnly } = req.body;
  if (!transactions) {
    return res.status(400).json({ error: 'transactions required' });
  }
  const result = generateLocalRecommendations(transactions, preferences, discountOnly);
  res.json(result);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
