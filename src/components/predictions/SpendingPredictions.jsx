import React, { useState, useEffect } from 'react';
import { MLService } from '../../services/MLServices';
import {
  BarChart, Bar, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Clock,
  RefreshCw,
  DollarSign,
  Coffee,
  Utensils,
  Pizza,
  Moon,
  Info,
  MapPin,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { auth } from '../../firebase/config';

// Custom color scheme
const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', 
  '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
];

export default function SpendingPredictions({ 
  transactions = [], 
  currentBalance = 0,
  mealPlanType = 'level2',
  className = '',
  onBalanceUpdate = null
}) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedView, setSelectedView] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  useEffect(() => {
    fetchPredictions();
  }, [transactions, currentBalance]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (refreshing) {
        setRefreshing(true);
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use ML service helper which falls back to a local algorithm
      const data = await MLService.getPredictions(
        transactions,
        currentBalance,
        mealPlanType
      );

      setPredictions(data);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err.message);
      const fallback = MLService.generateLocalPredictions(transactions, currentBalance);
      if (fallback) {
        setPredictions(fallback);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPredictions();
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'HIGH':
        return 'text-red-500';
      case 'MEDIUM':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  const getRiskBgColor = (risk) => {
    switch (risk) {
      case 'HIGH':
        return 'bg-red-500/20 border-red-500';
      case 'MEDIUM':
        return 'bg-yellow-500/20 border-yellow-500';
      default:
        return 'bg-green-500/20 border-green-500';
    }
  };

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Icons for meal periods
  const mealIcons = {
    breakfast: Coffee,
    lunch: Utensils,
    dinner: Pizza,
    afternoon: Coffee,
    latenight: Moon
  };

  if (loading && !refreshing) {
    return (
      <div className={`${className} bg-gray-800 p-6 rounded-lg`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">AI Spending Analysis</h2>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          <p className="ml-3 text-gray-300">Analyzing your spending patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} bg-gray-800 p-6 rounded-lg`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-indigo-400" />
          AI Spending Analysis
        </h2>
        <div className="flex items-center">
          <div className="flex border border-gray-700 rounded-lg overflow-hidden mr-2">
            <button
              onClick={() => setSelectedView('overview')}
              className={`px-3 py-1.5 text-sm ${
                selectedView === 'overview' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedView('patterns')}
              className={`px-3 py-1.5 text-sm ${
                selectedView === 'patterns' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Patterns
            </button>
            <button
              onClick={() => setSelectedView('recommendations')}
              className={`px-3 py-1.5 text-sm ${
                selectedView === 'recommendations' 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Tips
            </button>
          </div>
          <button 
            onClick={handleRefresh} 
            className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:bg-gray-600"
            disabled={refreshing}
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          {error}
        </div>
      )}
      
      {predictions && (
        <div>
          {/* OVERVIEW TAB */}
          {selectedView === 'overview' && (
            <>
              {/* Funds Depletion Preview */}
              <div className={`p-4 rounded-lg border ${getRiskBgColor(predictions.funds_depletion.risk_level)} mb-6`}>
                <div className="flex items-start flex-wrap md:flex-nowrap gap-4">
                  <div className="flex items-center">
                    <div className="bg-gray-800 rounded-full p-3">
                      <Wallet className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">Funds Prediction</h3>
                    <p className="text-gray-300">
                      At your current spending rate, your meal plan funds will last approximately{' '}
                      <span className="font-bold">{predictions.funds_depletion.days_to_depletion.toFixed(0)} days</span> until{' '}
                      <span className="font-bold">{new Date(predictions.funds_depletion.depletion_date).toLocaleDateString()}</span>.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-400">Current Balance</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(predictions.funds_depletion.current_balance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Recommended Daily</p>
                        <p className="text-lg font-bold text-green-400">{formatCurrency(predictions.funds_depletion.daily_budget)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-gray-800 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                    <p className={`text-lg font-bold ${getRiskColor(predictions.funds_depletion.risk_level)}`}>
                      {predictions.funds_depletion.risk_level}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Weekly Spending Forecast */}
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-indigo-400" />
                  Weekly Spending Forecast
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={predictions.weekly_spending}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="day_name" 
                        tick={{ fill: '#9CA3AF' }} 
                        axisLine={{ stroke: '#4B5563' }}
                      />
                      <YAxis 
                        tick={{ fill: '#9CA3AF' }} 
                        axisLine={{ stroke: '#4B5563' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        labelStyle={{ color: '#E5E7EB' }}
                      />
                      <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                      <Bar dataKey="total_predicted" name="Predicted Spending" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Daily Breakdown */}
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-indigo-400" />
                  Daily Meal Breakdown
                </h3>
                <div className="mb-4 border-b border-gray-600 pb-4">
                  <select
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    value={selectedDayIndex}
                    onChange={(e) => setSelectedDayIndex(parseInt(e.target.value))}
                  >
                    {predictions.weekly_spending.map((day, index) => (
                      <option key={index} value={index}>
                        {day.day_name} - {formatCurrency(day.total_predicted)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4">
                  {Object.entries(predictions.weekly_spending[selectedDayIndex].predicted_spending)
                    .filter(([_, amount]) => amount > 0)
                    .map(([mealTime, amount]) => {
                      const MealIcon = mealIcons[mealTime] || Utensils;
                      return (
                        <div key={mealTime} className="flex items-center">
                          <div className="bg-gray-800 p-2 rounded-lg mr-3">
                            <MealIcon className="h-5 w-5 text-indigo-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <p className="text-white capitalize">{mealTime}</p>
                              <p className="text-gray-300 font-medium">{formatCurrency(amount)}</p>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-2 mt-1">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full" 
                                style={{ width: `${(amount / predictions.weekly_spending[selectedDayIndex].total_predicted) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
          
          {/* PATTERNS TAB */}
          {selectedView === 'patterns' && predictions.spending_patterns && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-400 uppercase mb-1">Total Spending</h4>
                  <p className="text-xl font-bold text-white">{formatCurrency(predictions.spending_patterns.summary.total_spending)}</p>
                  <p className="text-sm text-gray-400 mt-1">{predictions.spending_patterns.summary.transaction_count} transactions</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-400 uppercase mb-1">Avg. Transaction</h4>
                  <p className="text-xl font-bold text-white">{formatCurrency(predictions.spending_patterns.summary.average_transaction)}</p>
                  <p className="text-sm text-gray-400 mt-1">Max: {formatCurrency(predictions.spending_patterns.summary.max_transaction)}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-xs text-gray-400 uppercase mb-1">Meal Plan Efficiency</h4>
                  <p className="text-xl font-bold text-white">{predictions.spending_patterns.meal_plan_efficiency?.rating || 'N/A'}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {predictions.spending_patterns.meal_plan_efficiency?.commons_percentage.toFixed(0) || 0}% at commons
                  </p>
                </div>
              </div>
              
              {/* Meal Period Distribution */}
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h3 className="text-white font-semibold mb-4">Meal Period Distribution</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={predictions.spending_patterns.meal_period}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="total_spending"
                        nameKey="period"
                        label={({ period, percent }) => `${period} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {predictions.spending_patterns.meal_period.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        labelStyle={{ color: '#E5E7EB' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Day of Week Analysis */}
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h3 className="text-white font-semibold mb-4">Daily Spending Pattern</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={predictions.spending_patterns.day_of_week}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="day" 
                        tick={{ fill: '#9CA3AF' }} 
                        axisLine={{ stroke: '#4B5563' }}
                      />
                      <YAxis 
                        tick={{ fill: '#9CA3AF' }} 
                        axisLine={{ stroke: '#4B5563' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151' }}
                        labelStyle={{ color: '#E5E7EB' }}
                      />
                      <Legend />
                      <Bar dataKey="total_spending" name="Total Spending" fill="#8884d8" />
                      <Bar dataKey="average_transaction" name="Avg. Transaction" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Top Locations */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-4">Top Spending Locations</h3>
                <div className="space-y-4">
                  {predictions.spending_patterns.top_locations.map((location, index) => (
                    <div key={location.location} className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center mr-3">
                            <span className="text-indigo-400 font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{location.location}</h4>
                            <p className="text-sm text-gray-400">{location.transaction_count} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-400">{formatCurrency(location.total_spending)}</p>
                          <p className="text-sm text-gray-400">Avg: {formatCurrency(location.average_transaction)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* RECOMMENDATIONS TAB */}
          {selectedView === 'recommendations' && predictions.spending_patterns && (
            <>
              {/* Meal Plan Efficiency */}
              {predictions.spending_patterns.meal_plan_efficiency && (
                <div className="bg-gray-700 p-4 rounded-lg mb-6">
                  <h3 className="text-white font-semibold mb-4">Meal Plan Efficiency</h3>
                  <div className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300">Commons Usage</span>
                      <span className="text-gray-300">{predictions.spending_patterns.meal_plan_efficiency.commons_percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${predictions.spending_patterns.meal_plan_efficiency.commons_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <h4 className="text-gray-400 text-sm mb-1">Commons Spending</h4>
                      <p className="text-white font-medium">{formatCurrency(predictions.spending_patterns.meal_plan_efficiency.commons_spending)}</p>
                    </div>
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <h4 className="text-gray-400 text-sm mb-1">Non-Commons Spending</h4>
                      <p className="text-white font-medium">{formatCurrency(predictions.spending_patterns.meal_plan_efficiency.non_commons_spending)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-600/20 border border-indigo-500 p-4 rounded-lg">
                    <div className="flex items-start">
                      <DollarSign className="h-5 w-5 text-indigo-400 mr-3 mt-0.5" />
                      <div>
                        <h4 className="text-white font-medium mb-1">Potential Savings</h4>
                        <p className="text-indigo-300">
                          You could save approximately <span className="font-bold">{formatCurrency(predictions.spending_patterns.meal_plan_efficiency.potential_savings)}</span> by shifting your non-commons spending to dining commons.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Personalized Recommendations */}
              <div className="space-y-4 mb-6">
                <h3 className="text-white font-semibold">Personalized Recommendations</h3>
                
                {predictions.spending_patterns.recommendations.map((recommendation, index) => (
                  <div 
                    key={index} 
                    className={`bg-gray-700 p-4 rounded-lg border-l-4 ${
                      recommendation.type === 'time_pattern' 
                        ? 'border-yellow-500' 
                        : recommendation.type === 'day_pattern'
                          ? 'border-orange-500'
                          : 'border-indigo-500'
                    }`}
                  >
                    <h4 className="text-white font-medium mb-2">{recommendation.title}</h4>
                    <p className="text-gray-300 text-sm">{recommendation.description}</p>
                  </div>
                ))}
              </div>
              
              {/* Comparison to Average */}
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h3 className="text-white font-semibold mb-4">Spending Comparison</h3>
                <div className="space-y-4">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-white">Average Transaction</h4>
                      <div className="flex items-center">
                        {predictions.spending_patterns.summary.average_transaction > 12 ? (
                          <ThumbsDown className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <ThumbsUp className="h-4 w-4 text-green-500 mr-1" />
                        )}
                        <span className={predictions.spending_patterns.summary.average_transaction > 12 ? 'text-red-500' : 'text-green-500'}>
                          {predictions.spending_patterns.summary.average_transaction > 12 ? 'Above' : 'Below'} average
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>You</span>
                          <span>PSU Average</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full relative">
                            <span 
                              className="absolute h-full w-2 bg-gray-300"
                              style={{ left: `calc(${Math.min(100, (12 / predictions.spending_patterns.summary.average_transaction) * 100)}% - 1px)` }}
                            ></span>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-indigo-400">{formatCurrency(predictions.spending_patterns.summary.average_transaction)}</span>
                          <span className="text-gray-400">$12.00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-white">Commons Usage</h4>
                      <div className="flex items-center">
                        {predictions.spending_patterns.meal_plan_efficiency.commons_percentage < 60 ? (
                          <ThumbsDown className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <ThumbsUp className="h-4 w-4 text-green-500 mr-1" />
                        )}
                        <span className={predictions.spending_patterns.meal_plan_efficiency.commons_percentage < 60 ? 'text-red-500' : 'text-green-500'}>
                          {predictions.spending_patterns.meal_plan_efficiency.commons_percentage < 60 ? 'Below' : 'Above'} average
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>You</span>
                          <span>PSU Average</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 rounded-full" 
                            style={{ width: `${predictions.spending_patterns.meal_plan_efficiency.commons_percentage}%` }}
                          >
                            <span 
                              className="absolute h-full w-2 bg-gray-300"
                              style={{ left: 'calc(60% - 1px)' }}
                            ></span>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-indigo-400">{predictions.spending_patterns.meal_plan_efficiency.commons_percentage.toFixed(1)}%</span>
                          <span className="text-gray-400">60.0%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* How to Save Money */}
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-white font-semibold mb-4">How to Save Money</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="bg-gray-800 p-2 rounded-full mr-3">
                      <DollarSign className="h-4 w-4 text-green-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-sm font-medium">Use Your Meal Plan at Dining Commons</h4>
                      <p className="text-gray-400 text-xs">The 65% discount at dining commons provides the best value for your meal plan dollars.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-gray-800 p-2 rounded-full mr-3">
                      <Clock className="h-4 w-4 text-yellow-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-sm font-medium">Visit During Off-Peak Hours</h4>
                      <p className="text-gray-400 text-xs">Dining commons are less crowded between 2-4pm and after 7pm, providing faster service.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-gray-800 p-2 rounded-full mr-3">
                      <MapPin className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-sm font-medium">Use LionCash at Markets and the HUB</h4>
                      <p className="text-gray-400 text-xs">LionCash provides a 10% discount at locations where meal plans don't receive discounts.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="bg-gray-800 p-2 rounded-full mr-3">
                      <Calendar className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-sm font-medium">Plan Your Meals Weekly</h4>
                      <p className="text-gray-400 text-xs">Planning ahead helps prevent impulse spending and ensures you stay within your budget.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}