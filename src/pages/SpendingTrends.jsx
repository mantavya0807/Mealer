import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { updateDoc, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import MealPlanSettingsForm from '../components/MealPlanSettingsForm';
import { getAuth } from 'firebase/auth';
import { MultiSelect } from '../components/ui/multi-select';
import { collection, query, getDocs } from 'firebase/firestore';
import { SpendingPredictions } from './SpendingPredictions';
import { 
  BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Calendar,
  CircleDashed,
  Coffee,
  Utensils,
  Moon,
  AlertCircle,
  Info
} from 'lucide-react';

import { all } from 'axios';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#af19ff'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Constants for discount calculations
const DISCOUNT_CONFIG = {
  mealPlan: {
    regular: 0.65, // This represents the ratio/percentage
    central: 0,
    market: 0
  },
  lionCash: {
    regular: 0.10,
    central: 0,
    market: 0.10
  }
};

const COMMONS_MAPPING = {
  'findlay': 'East Commons',
  'warnock': 'North Commons',
  'waring': 'West Commons',
  'redifer': 'South Commons',
  'pollock': 'Pollock Commons'
};

const MEAL_TIMES = {
  breakfast: { start: 6, end: 10 },
  lunch: { start: 11, end: 14 },
  dinner: { start: 17, end: 21 },
  lateNight: { start: 21, end: 24 }
};

export default function SpendingTrends() {
  // State Variables
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('monthly');
  
  // **New State Variables Added**
  const [currentBalance, setCurrentBalance] = useState(0); // Initialize appropriately
  const [mealPlanType, setMealPlanType] = useState('regular'); // Initialize appropriately

  // SpendingTrends.jsx
const handleMealPlanUpdate = async ({ currentBalance, mealPlanType }) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be signed in to update settings');
    }

    if (!selectedUsers.length) {
      throw new Error('No user selected');
    }

    const userEmail = selectedUsers[0];

    // Verify the logged-in user matches the selected user
    if (user.email !== userEmail) {
      throw new Error('You can only update your own settings');
    }

    // Create the user document if it doesn't exist
    const userRef = doc(db, 'users', userEmail);
    
    await setDoc(userRef, {
      currentBalance,
      mealPlanType,
      lastUpdated: serverTimestamp(),
      email: userEmail // Add this to ensure the document exists
    }, { merge: true }); // Use merge to update only specified fields

    setCurrentBalance(currentBalance);
    setMealPlanType(mealPlanType);

  } catch (err) {
    console.error('Error updating meal plan settings:', err);
    // Show error to user
    throw new Error(err.message || 'Failed to update settings');
  }
};

  // Function to get base location
  const getBaseLocation = (location) => {
    // Convert to lowercase for case-insensitive comparison
    const loc = location.toLowerCase();
    
    // Check for commons first
    for (const [key, value] of Object.entries(COMMONS_MAPPING)) {
      if (loc.includes(key)) {
        return value;
      }
    }
    
    // Extract first significant word (excluding common prefixes)
    const words = loc.split(' ');
    let baseWord = words[0];
    
    if (baseWord === 'up' || baseWord === '-up' || baseWord === 'the') {
      baseWord = words[1] || words[0];
    }
    
    // Special cases
    if (loc.includes('starbucks')) return 'Starbucks';
    if (loc.includes('chick') || loc.includes('cfa')) return 'Chick-fil-A';
    if (baseWord.includes('edge')) return 'Edge Coffee';
    if (baseWord.includes('louie')) return "Louie's";
    
    // If it's just "commons", return null to prevent generic "Commons" appearing
    if (baseWord === 'commons') return null;
    
    // Capitalize first letter
    return baseWord.charAt(0).toUpperCase() + baseWord.slice(1);
  };

  // Fetch all PSU users that have transaction data
  useEffect(() => {
    const fetchAvailablePSUUsers = async () => {
      try {
        // Fetch all searches first
        const response = await fetch(
          'http://127.0.0.1:5001/meal-plan-optimizer/us-central1/api/searches'
        );
    
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
    
        const data = await response.json();
        
        // Extract unique PSU emails from searches
        const uniquePsuEmails = new Set(
          data.searches.map(search => search.psuEmail)
        );
    
        // Convert to format needed for MultiSelect
        const psuUsers = Array.from(uniquePsuEmails).map(email => ({
          id: email,
          email: email
        }));
    
        console.log('Found PSU users:', psuUsers);
    
        if (psuUsers.length > 0) {
          setAvailableUsers(psuUsers);
          setSelectedUsers([psuUsers[0].email]);
        } else {
          console.log('No PSU users found');
          setError('No Penn State users found in the database');
        }
      } catch (err) {
        console.error('Error fetching PSU users:', err);
        setError('Failed to load available PSU users');
      } finally {
        setLoading(false);
      }
    };
    fetchAvailablePSUUsers();
  }, []);

  // Fetch transactions whenever selected users change
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedUsers.length) return;

      setLoading(true);
      try {
        const allTransactions = [];

        // Fetch transactions for each selected user
        for (const userEmail of selectedUsers) {
          const userTransactionsRef = collection(db, 'users', userEmail, 'transactions');
          const snapshot = await getDocs(userTransactionsRef);

          const userTransactions = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              userEmail,
              // Safely handle timestamp
              timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
            };
          });

          allTransactions.push(...userTransactions);
        }

        setTransactions(allTransactions);
        setError(null);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to fetch transaction data');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [selectedUsers]);

  // Analytics Calculation
  const analytics = useMemo(() => {
    if (!transactions.length) return null;

    try {
      // Calculate actual cost and discounts
      const calculateActualCost = (transaction) => {
        const { amount, accountType, location } = transaction;
        const isMarket = location.toLowerCase().includes('market');
        const isCentral = location.toLowerCase().includes('hub') || 
                           location.toLowerCase().includes('central');

        if (accountType === 'CampusMealPlan') {
          if (isMarket || isCentral) {
            return Math.abs(amount);
          }
          // Use the ratio directly without fixed numbers
          return Math.abs(amount) / (1 - DISCOUNT_CONFIG.mealPlan.regular);
        }

        return Math.abs(amount);
      };

      // Rest of the analytics calculation remains the same, but use getBaseLocation
      const dailySpending = {};
      const categoryBreakdown = {};
      const locationSpending = {};
      const mealTimeSpending = {
        breakfast: {},
        lunch: {},
        dinner: {},
        lateNight: {}
      };

      let totalActualCost = 0;
      let wastedDiscountOpportunities = 0;
      const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      transactions.forEach(t => {
        const actualCost = calculateActualCost(t);
        const baseLocation = getBaseLocation(t.location);
        
        // Skip if location is null
        if (!baseLocation) return;

        const day = DAYS[t.timestamp.getDay()];
        const hour = t.timestamp.getHours();

        // Update totals
        totalActualCost += actualCost;
        if (t.accountType === 'CampusMealPlan' && 
            (t.location.toLowerCase().includes('market') || 
             t.location.toLowerCase().includes('hub'))) {
          wastedDiscountOpportunities += Math.abs(t.amount);
        }

        // Update daily spending
        dailySpending[day] = (dailySpending[day] || 0) + Math.abs(t.amount);

        // Update category breakdown
        const category = t.category || 'Uncategorized';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + Math.abs(t.amount);

        // Update location spending
        locationSpending[baseLocation] = (locationSpending[baseLocation] || 0) + 
          Math.abs(t.amount);

        // Update meal time spending
        for (const [mealTime, timeRange] of Object.entries(MEAL_TIMES)) {
          if (hour >= timeRange.start && hour < timeRange.end) {
            if (!mealTimeSpending[mealTime][baseLocation]) {
              mealTimeSpending[mealTime][baseLocation] = {
                visits: 0,
                totalSpent: 0
              };
            }
            mealTimeSpending[mealTime][baseLocation].visits++;
            mealTimeSpending[mealTime][baseLocation].totalSpent += Math.abs(t.amount);
          }
        }
      });

      // Format meal preferences
      const mealPreferences = {};
      for (const [mealTime, locations] of Object.entries(mealTimeSpending)) {
        mealPreferences[mealTime] = Object.entries(locations)
          .map(([location, stats]) => ({
            location,
            visits: stats.visits,
            totalSpent: stats.totalSpent,
            averageSpent: stats.totalSpent / stats.visits
          }))
          .sort((a, b) => b.visits - a.visits);
      }

      // Calculate meal plan efficiency based on the discount ratio
      const mealPlanTransactions = transactions.filter(t => t.accountType === 'CampusMealPlan');
      const mealPlanSpent = mealPlanTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const mealPlanEfficiency = mealPlanSpent > 0 ? 
        ((totalActualCost - totalSpending) / (totalActualCost * DISCOUNT_CONFIG.mealPlan.regular)) : 0;

      const topLocations = Object.entries(locationSpending)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      return {
        totalSpending,
        averageTransaction: totalSpending / transactions.length,
        busiestDay: Object.entries(dailySpending)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
        topCategory: Object.entries(categoryBreakdown)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
        dailySpending,
        categoryBreakdown,
        topLocations,
        mealPreferences,
        discountAnalysis: {
          actualSpent: totalSpending,
          potentialCost: totalActualCost,
          totalSaved: totalActualCost - totalSpending,
          wastedDiscountOpportunities,
          mealPlanEfficiency
        }
      };
    } catch (err) {
      console.error('Error calculating analytics:', err);
      return null;
    }
  }, [transactions]);

  // InfoTooltip Component
  const InfoTooltip = ({ label, tooltip }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    return (
      <div className="relative inline-block">
        <div 
          className="inline-flex items-center cursor-help"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        >
          {label}
          <Info className="h-4 w-4 ml-1 text-gray-400" />
        </div>
        
        {isVisible && (
          <div className="absolute z-50 w-64 p-3 text-sm bg-gray-800 text-gray-200 rounded-md shadow-lg border border-gray-700 -right-2 top-full mt-1">
            <div className="absolute -top-2 right-3 w-4 h-4 bg-gray-800 border-t border-l border-gray-700 transform rotate-45" />
            {tooltip}
          </div>
        )}
      </div>
    );
  };

  // Render Loading State
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <CircleDashed className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-white">Loading trends...</span>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
        {error}
      </div>
    );
  }

  // Main Render
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Spending Trends</h1>
        {availableUsers.length > 0 ? (
          <MultiSelect
            options={availableUsers.map(user => ({
              value: user.email,
              label: user.email
            }))}
            value={selectedUsers.map(email => ({
              value: email,
              label: email
            }))}
            onChange={(selected) => setSelectedUsers(selected.map(s => s.value))}
            className="w-96"
            placeholder="Select users to compare..."
          />
        ) : (
          <div className="text-gray-400">No Penn State users available</div>
        )}
      </div>

      {/* Show empty state with more context */}
      {!loading && !error && (!transactions || transactions.length === 0) && (
        <div className="text-center p-6 text-gray-400">
          {availableUsers.length === 0 
            ? "No Penn State users found in the database"
            : "No transaction data available. Please select a user to view their spending trends."
          }
        </div>
      )}

      {/* Show analytics only when we have data */}
      {!loading && !error && analytics && (
        <>
          <SpendingPredictions 
            transactions={transactions}
            currentBalance={currentBalance}
            mealPlanType={mealPlanType}
          />
          
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-gray-400">Total Spending</p>
                  <p className="text-2xl font-bold text-white">
                    ${analytics.totalSpending.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm text-gray-400">Avg Transaction</p>
                  <p className="text-2xl font-bold text-white">
                    ${analytics.averageTransaction.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-purple-400" />
                <div className="ml-3">
                  <p className="text-sm text-gray-400">Busiest Day</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.busiestDay}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-400" />
                <div className="ml-3">
                  <p className="text-sm text-gray-400">Top Category</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.topCategory}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Meal Plan Settings Form */}
          <MealPlanSettingsForm
            currentBalance={currentBalance}
            mealPlanType={mealPlanType}
            onUpdate={handleMealPlanUpdate}
            className="mb-6"
          />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Spending Pattern */}
            <div className="bg-gray-800 p-6 rounded-lg h-[400px]">
              <h2 className="text-lg font-semibold text-white mb-4">Daily Spending Pattern</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DAYS.map(day => ({
                  name: day,
                  amount: analytics.dailySpending[day] || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                    labelStyle={{ color: '#9CA3AF' }}
                    formatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Spending by Category */}
            <div className="bg-gray-800 p-6 rounded-lg h-[400px]">
              <h2 className="text-lg font-semibold text-white mb-4">Spending by Category</h2>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(analytics.categoryBreakdown).map(([name, value]) => ({
                      name,
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={130}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(analytics.categoryBreakdown).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                    formatter={(value) => `$${value.toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Locations */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm text-gray-400">Top Locations</p>
                <p className="text-2xl font-bold text-white">Top 5</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {analytics.topLocations.map((location, index) => (
                <div key={location.name} className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">#{index + 1}</p>
                  <p className="text-white font-medium mt-1">{location.name}</p>
                  <p className="text-indigo-400 text-lg mt-1">
                    ${location.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Discount Analysis */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Discount Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="h-6 w-6 text-green-400" />
                  <div className="ml-3">
                    <InfoTooltip
                      label={<span className="text-sm text-gray-400">Total Saved</span>}
                      tooltip="The total amount saved through meal plan and LionCash discounts compared to retail prices."
                    />
                    <p className="text-xl font-bold text-white">
                      ${analytics.discountAnalysis.totalSaved.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                  <div className="ml-3">
                    <InfoTooltip
                      label={<span className="text-sm text-gray-400">Wasted Opportunities</span>}
                      tooltip="Amount spent at locations where meal plan discounts don't apply (like markets or hub locations). Consider using these funds at locations with meal plan discounts to maximize savings."
                    />
                    <p className="text-xl font-bold text-white">
                      ${analytics.discountAnalysis.wastedDiscountOpportunities.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                  <div className="ml-3">
                    <InfoTooltip
                      label={<span className="text-sm text-gray-400">Meal Plan Efficiency</span>}
                      tooltip="How effectively you're using your meal plan discounts. 100% means you're maximizing available discounts, lower percentages indicate potential for more savings by choosing locations with better discount rates."
                    />
                    <p className="text-xl font-bold text-white">
                      {(analytics.discountAnalysis.mealPlanEfficiency * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Meal Time Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(analytics.mealPreferences).map(([mealTime, preferences]) => {
              const Icon = mealTime === 'breakfast' ? Coffee :
                          mealTime === 'lateNight' ? Moon : Utensils;
              
              return (
                <div key={mealTime} className="bg-gray-800 p-6 rounded-lg">
                  <div className="flex items-center mb-4">
                    <Icon className="h-6 w-6 text-indigo-400" />
                    <h3 className="text-lg font-semibold text-white ml-2">
                      {mealTime.charAt(0).toUpperCase() + mealTime.slice(1)} Preferences
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {preferences.slice(0, 3).map((pref) => (
                      <div key={pref.location} className="bg-gray-700 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{pref.location}</p>
                            <p className="text-sm text-gray-400">{pref.visits} visits</p>
                          </div>
                          <div className="text-right">
                            <p className="text-indigo-400">${pref.averageSpent.toFixed(2)}</p>
                            <p className="text-sm text-gray-400">avg/visit</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
