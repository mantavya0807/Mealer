import { useState, useEffect, useMemo, useCallback } from 'react';
import { db, auth } from '../firebase/config';
import { 
  updateDoc, setDoc, doc, serverTimestamp, getDoc, 
  collection, getDocs, query, where, orderBy, limit 
} from 'firebase/firestore';
import MealPlanSettingsForm from '../components/MealPlanSettingsForm';
import { MultiSelect } from '../components/ui/multi-select'; // Add this component
import { SpendingPredictions } from './SpendingPredictions';
import { 
  BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
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
  Info,
  User,
  Wallet,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  Sparkles,
  LightbulbIcon,
  PieChartIcon,
  MessageCircle,
  HelpCircle,
  Filter,
  LayoutDashboard,
  MapPin,
  BarChart2,
  Leaf,
  Check
} from 'lucide-react';

// Import Penn State specific constants
import {
  DAYS,
  CHART_COLORS,
  MEAL_PLANS,
  MEAL_TIMES,
  DINING_COMMONS,
  CAMPUS_LOCATIONS,
  SAVING_TIPS,
  identifyPsuLocation,
  categorizePsuTransaction,
  DISCOUNT_RATES,
  SEMESTER_SCHEDULE
} from '../constants/pennState';

// Custom hook for authenticated user's data
const useUserData = () => {
  const [userData, setUserData] = useState({
    currentBalance: 0,
    mealPlanType: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userDocRef = doc(db, 'users', user.email);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            currentBalance: data.currentBalance || 0,
            mealPlanType: data.mealPlanType || 'level1'
          });
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return { userData, loading };
};

// Component for displaying a collapsible section
const CollapsibleSection = ({ title, icon: Icon, children, initiallyOpen = true }) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          {Icon && <Icon className="h-5 w-5 text-indigo-400 mr-2" />}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {isOpen ? 
          <ChevronUp className="h-5 w-5 text-gray-400" /> : 
          <ChevronDown className="h-5 w-5 text-gray-400" />
        }
      </div>
      {isOpen && <div className="p-6 border-t border-gray-700">{children}</div>}
    </div>
  );
};

// Component for displaying a tip or suggestion
const SavingTip = ({ icon: Icon, title, description }) => (
  <div className="bg-gray-700 p-4 rounded-lg flex items-start space-x-3">
    <div className="bg-indigo-500/10 p-2 rounded-full">
      <Icon className="h-5 w-5 text-indigo-400" />
    </div>
    <div>
      <h3 className="font-medium text-white">{title}</h3>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
    </div>
  </div>
);

// Component for displaying info tooltip
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

// Tab component
const TabButton = ({ active, label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-3 font-medium flex items-center ${
      active 
        ? 'bg-gray-700 text-white border-b-2 border-indigo-500' 
        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
    }`}
  >
    {Icon && <Icon className="h-4 w-4 mr-2" />}
    {label}
  </button>
);

// Stat card component
const StatCard = ({ icon: Icon, label, value, color = "blue" }) => {
  const colorClasses = {
    green: "text-green-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    orange: "text-orange-400",
    indigo: "text-indigo-400",
    red: "text-red-400"
  };
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex items-center">
        <Icon className={`h-7 w-7 ${colorClasses[color]}`} />
        <div className="ml-3">
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default function SpendingTrends() {
  // State Variables
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    mealPlan: true,
    predictions: true,
    overview: true,
    details: false,
    suggestions: false
  });
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { userData, loading: userDataLoading } = useUserData();
  
  // Initialize with user data from the custom hook
  const [currentBalance, setCurrentBalance] = useState(0);
  const [mealPlanType, setMealPlanType] = useState('');

  // Update local state when user data is loaded
  useEffect(() => {
    if (!userDataLoading) {
      setCurrentBalance(userData.currentBalance);
      setMealPlanType(userData.mealPlanType);
    }
  }, [userData, userDataLoading]);

  // Handle meal plan settings update
  const handleMealPlanUpdate = async ({ currentBalance, mealPlanType }) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be signed in to update settings');
      }

      // Create the user document if it doesn't exist
      const userRef = doc(db, 'users', user.email);
      
      await setDoc(userRef, {
        currentBalance,
        mealPlanType,
        lastUpdated: serverTimestamp(),
        email: user.email
      }, { merge: true });

      setCurrentBalance(currentBalance);
      setMealPlanType(mealPlanType);
      setUpdateSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);

    } catch (err) {
      console.error('Error updating meal plan settings:', err);
      throw new Error(err.message || 'Failed to update settings');
    }
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch the current user's transactions
  useEffect(() => {
    const fetchUserTransactions = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setError('You must be signed in to view transaction data');
          return;
        }

        const userTransactionsRef = collection(db, 'users', user.email, 'transactions');
        const snapshot = await getDocs(userTransactionsRef);

        const userTransactions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            // Add additional processed fields
            location: identifyPsuLocation(data.location),
            ...categorizePsuTransaction(data.location || '', Math.abs(data.amount || 0)),
            // Safely handle timestamp
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
          };
        });

        setTransactions(userTransactions);
        setError(null);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to fetch transaction data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserTransactions();
  }, []);

  // Filter transactions based on selected time frame and category
// Fix the time frame filtering to work properly
const filteredTransactions = useMemo(() => {
  let filtered = transactions;
  
  // Filter by time frame
  if (selectedTimeFrame !== 'all') {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (selectedTimeFrame) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        console.log('Filtering for last week:', cutoffDate);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        console.log('Filtering for last month:', cutoffDate);
        break;
      case 'semester':
        // Approximately 4 months (120 days)
        cutoffDate.setDate(now.getDate() - 120);
        console.log('Filtering for semester:', cutoffDate);
        break;
      default:
        cutoffDate.setFullYear(1970); // All time
        break;
    }
    
    filtered = filtered.filter(t => {
      // Ensure timestamp is a proper Date object
      const txDate = t.timestamp instanceof Date ? 
        t.timestamp : 
        new Date(t.timestamp);
      
      return txDate >= cutoffDate;
    });
    
    console.log(`Filtered to ${filtered.length} transactions after time frame filter`);
  }
  
  // Filter by category
  if (selectedCategory !== 'all') {
    filtered = filtered.filter(t => t.category === selectedCategory);
    console.log(`Filtered to ${filtered.length} transactions after category filter`);
  }
  
  return filtered;
}, [transactions, selectedTimeFrame, selectedCategory]);

  // Export transactions as CSV
  const exportTransactionsCSV = useCallback(() => {
    if (!filteredTransactions.length) return;
    
    const headers = ['Date', 'Location', 'Category', 'Amount', 'Transaction Type', 'Account Type'];
    
    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        t.timestamp.toLocaleDateString(),
        `"${t.location}"`,
        `"${t.category}"`,
        Math.abs(t.amount).toFixed(2),
        `"${t.transactionType}"`,
        `"${t.accountType}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `psu-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredTransactions]);

  // Analytics Calculation
  const analytics = useMemo(() => {
    if (!filteredTransactions.length) return null;

    try {
      // Prepare data structures for analytics
      const dailySpending = {};
      const categoryBreakdown = {};
      const locationSpending = {};
      const hourlySpending = Array(24).fill(0).map((_, idx) => ({ hour: idx, amount: 0, count: 0 }));
      const weeklySpending = {};
      const mealTimeSpending = {
        breakfast: {},
        lunch: {},
        dinner: {},
        lateNight: {}
      };

      let totalSpending = 0;
      let mealCount = 0;
      let snackCount = 0;
      let coffeeCount = 0;
      let discountedSpending = 0;
      let nonDiscountedSpending = 0;
      
      // Identify current week number for weekly trends
      const getWeekNumber = (date) => {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      };

      // Process each transaction
      filteredTransactions.forEach(t => {
        const amount = Math.abs(t.amount || 0);
        totalSpending += amount;
        
        // Update classification counts
        if (t.isMeal) mealCount++;
        if (t.isSnack) snackCount++;
        if (t.category === 'Coffee') coffeeCount++;
        
        const day = DAYS[t.timestamp.getDay()];
        const hour = t.timestamp.getHours();
        const weekNum = getWeekNumber(t.timestamp);
        const weekLabel = `Week ${weekNum}`;

        // Track discounted vs. non-discounted spending
        let isDiscounted = false;
        if (t.accountType === 'CampusMealPlan') {
          if (['East', 'North', 'South', 'West', 'Pollock'].includes(t.category)) {
            isDiscounted = true;
            discountedSpending += amount;
          } else {
            nonDiscountedSpending += amount;
          }
        }

        // Update daily spending
        dailySpending[day] = (dailySpending[day] || 0) + amount;

        // Update category breakdown
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + amount;

        // Update location spending
        locationSpending[t.location] = (locationSpending[t.location] || 0) + amount;

        // Update hourly spending
        hourlySpending[hour] = {
          hour,
          amount: hourlySpending[hour].amount + amount,
          count: hourlySpending[hour].count + 1
        };
        
        // Update weekly spending
        weeklySpending[weekLabel] = (weeklySpending[weekLabel] || 0) + amount;

        // Update meal time spending
        for (const [mealTime, timeRange] of Object.entries(MEAL_TIMES)) {
          if (hour >= timeRange.start && hour < timeRange.end) {
            if (!mealTimeSpending[mealTime][t.location]) {
              mealTimeSpending[mealTime][t.location] = {
                visits: 0,
                totalSpent: 0
              };
            }
            mealTimeSpending[mealTime][t.location].visits++;
            mealTimeSpending[mealTime][t.location].totalSpent += amount;
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

      // Get top locations
      const topLocations = Object.entries(locationSpending)
        .filter(([name]) => name !== 'Unknown')
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));
        
      // Calculate busiest days and hours
      const busiestDay = Object.entries(dailySpending)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
        
      const busiestHour = [...hourlySpending]
        .sort((a, b) => b.count - a.count)[0]?.hour || 0;
        
      // Format hourly data for chart
      const hourlyData = hourlySpending.map(h => ({
        hour: `${h.hour}:00`,
        amount: h.amount,
        count: h.count
      }));
      
      // Format weekly data for chart
      const weeklyData = Object.entries(weeklySpending).map(([week, amount]) => ({
        week,
        amount
      })).sort((a, b) => a.week.localeCompare(b.week));
      
      // Calculate spending patterns
      const totalDays = new Set(filteredTransactions.map(t => 
        t.timestamp.toISOString().split('T')[0]
      )).size;
      
      const averageDaily = totalSpending / (totalDays || 1);
      const averageTransaction = totalSpending / filteredTransactions.length;
      
      // Get spending by payment method
      const spendingByPaymentMethod = filteredTransactions.reduce((acc, t) => {
        const method = t.accountType || 'Unknown';
        acc[method] = (acc[method] || 0) + Math.abs(t.amount || 0);
        return acc;
      }, {});
      
      // Calculate potential savings (what could have been saved if all spending was discounted)
      const potentialSavings = (nonDiscountedSpending * DISCOUNT_RATES.mealPlan.commons);
      
      // Calculate actual savings (what was saved through discounts)
      const actualSavings = (discountedSpending / (1 - DISCOUNT_RATES.mealPlan.commons)) * DISCOUNT_RATES.mealPlan.commons;

      return {
        totalSpending,
        averageDaily,
        averageTransaction,
        busiestDay,
        busiestHour,
        topCategory: Object.entries(categoryBreakdown)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
        dailySpending,
        categoryBreakdown,
        topLocations,
        mealPreferences,
        hourlyData,
        weeklyData,
        spendingByPaymentMethod,
        discountStats: {
          discountedSpending,
          nonDiscountedSpending,
          actualSavings,
          potentialSavings,
          percentDiscounted: (discountedSpending / (discountedSpending + nonDiscountedSpending) * 100) || 0
        },
        stats: {
          totalTransactions: filteredTransactions.length,
          mealCount,
          snackCount,
          coffeeCount,
          uniqueLocations: Object.keys(locationSpending).length,
          totalDays
        }
      };
    } catch (err) {
      console.error('Error calculating analytics:', err);
      return null;
    }
  }, [filteredTransactions]);

  // Generate personalized savings recommendations
  const savingsRecommendations = useMemo(() => {
    if (!analytics) return [];
    
    const recommendations = [];
    
    // Check if user spends a lot at markets (which don't offer discounts)
    const marketSpending = analytics.categoryBreakdown['Convenience'] || 0;
    if (marketSpending > analytics.totalSpending * 0.3) {
      recommendations.push({
        id: 'high-market-spending',
        icon: Wallet,
        title: 'Reduce convenience store spending',
        description: `You've spent $${marketSpending.toFixed(2)} (${(marketSpending/analytics.totalSpending*100).toFixed(0)}% of total) at markets where meal plan discounts don't apply. Consider using dining commons more often.`
      });
    }
    
    // Check if user has high late night spending
    const lateNightSpending = analytics.mealPreferences.lateNight?.reduce((sum, item) => sum + item.totalSpent, 0) || 0;
    if (lateNightSpending > analytics.totalSpending * 0.25) {
      recommendations.push({
        id: 'high-late-night',
        icon: Moon,
        title: 'Review late night spending',
        description: `Late night spending accounts for ${(lateNightSpending/analytics.totalSpending*100).toFixed(0)}% of your total. Consider eating earlier when more dining options are available.`
      });
    }
    
    // Check if user spends a lot on coffee
    const coffeeSpending = analytics.categoryBreakdown['Coffee'] || 0;
    if (coffeeSpending > analytics.totalSpending * 0.15) {
      recommendations.push({
        id: 'coffee-spending',
        icon: Coffee,
        title: 'Optimize coffee purchases',
        description: `You've spent $${coffeeSpending.toFixed(2)} on coffee. Consider a reusable mug for discounts or brew your own to save money.`
      });
    }
    
    // Check for imbalanced spending across days
    const maxDailySpending = Math.max(...Object.values(analytics.dailySpending));
    const avgDailySpending = analytics.averageDaily;
    if (maxDailySpending > avgDailySpending * 2) {
      const highestDay = Object.entries(analytics.dailySpending)
        .find(([, amount]) => amount === maxDailySpending)?.[0] || '';
      
      recommendations.push({
        id: 'unbalanced-days',
        icon: Calendar,
        title: 'Balance your weekly spending',
        description: `Your spending on ${highestDay} is much higher than other days. Try to distribute your meals more evenly throughout the week.`
      });
    }
    
    // Check discount utilization
    if (analytics.discountStats.percentDiscounted < 50) {
      recommendations.push({
        id: 'poor-discount-utilization',
        icon: DollarSign,
        title: 'Increase commons usage',
        description: `Only ${analytics.discountStats.percentDiscounted.toFixed(0)}% of your spending is at locations with meal plan discounts. You could save approximately $${analytics.discountStats.potentialSavings.toFixed(2)} more by using dining commons.`
      });
    }
    
    // Add trayless dining tip
    recommendations.push({
      id: 'trayless-dining',
      icon: Leaf,
      title: 'Embrace Trayless Dining',
      description: "Experience Penn State's new trayless dining policy designed to reduce food waste and promote sustainable practices."
    });
    
    // Add Penn State specific recommendations from constants
    const generalTips = SAVING_TIPS.filter(tip => 
      !recommendations.some(rec => rec.id === tip.id)
    ).slice(0, 2).map(tip => ({
      ...tip,
      icon: Sparkles
    }));
    
    return [...recommendations, ...generalTips];
  }, [analytics]);

  // Format currency values for display
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  // Format percentage values for display
  const formatPercent = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value / 100);
  };

  // Helper for calculating the semester burn rate
  const calculateBurnRate = () => {
    if (!analytics || !currentBalance) return null;
    
    const avgDailySpend = analytics.averageDaily;
    const daysRemaining = currentBalance / avgDailySpend;
    const semesterEndDate = new Date();
    semesterEndDate.setDate(semesterEndDate.getDate() + daysRemaining);
    
    return {
      daysRemaining: Math.round(daysRemaining),
      projectedEndDate: semesterEndDate,
      dailyBudget: currentBalance / 120, // Assuming ~120 days in a semester
      riskLevel: daysRemaining < 60 ? 'high' : daysRemaining < 90 ? 'medium' : 'low'
    };
  };

  // Calculate the burn rate
  const burnRate = useMemo(() => calculateBurnRate(), [analytics, currentBalance]);

  // Get available categories for filtering
  const availableCategories = useMemo(() => {
    if (!transactions.length) {
      return ['all'];
    }

    const categories = new Set();
    transactions.forEach(t => {
      if (t.category) categories.add(t.category);
    });

    return ['all', ...Array.from(categories)];
  }, [transactions]);

  // State for managing users and selections
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // Fetch all PSU users that have transaction data
  useEffect(() => {
    const fetchAvailablePSUUsers = async () => {
      try {
        setLoading(true);
        // Fetch all searches first
        const response = await fetch('http://127.0.0.1:5001/meal-plan-optimizer/us-central1/api/searches');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
    
        const data = await response.json();
        // Extract unique PSU emails from searches
        const uniquePsuEmails = new Set(data.searches.map(search => search.psuEmail));
    
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
 // Improved fetch transactions whenever selected users change
// Improved fetch transactions using API endpoints instead of direct Firestore access
useEffect(() => {
  const fetchTransactions = async () => {
    if (!selectedUsers.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching transactions for selected users: ${selectedUsers.join(', ')}`);
      const allTransactions = [];
      
      // Fetch transactions for each selected user through the API
      for (const userEmail of selectedUsers) {
        console.log(`Fetching transactions for PSU user: ${userEmail}`);
        
        // Get the most recent search for this user
        const searchResponse = await fetch(
          'http://127.0.0.1:5001/meal-plan-optimizer/us-central1/api/searches'
        );
        
        if (!searchResponse.ok) {
          throw new Error(`Failed to fetch searches: ${searchResponse.statusText}`);
        }
        
        const searchesData = await searchResponse.json();
        const userSearches = searchesData.searches.filter(search => 
          search.psuEmail === userEmail
        ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (userSearches.length > 0) {
          const mostRecentSearch = userSearches[0];
          console.log(`Found recent search for ${userEmail} with ID: ${mostRecentSearch.id}`);
          
          // Fetch the specific search details to get transactions
          const searchDetailsResponse = await fetch(
            `http://127.0.0.1:5001/meal-plan-optimizer/us-central1/api/searches/${mostRecentSearch.id}`
          );
          
          if (!searchDetailsResponse.ok) {
            throw new Error(`Failed to fetch search details: ${searchDetailsResponse.statusText}`);
          }
          
          const searchDetails = await searchDetailsResponse.json();
          
          if (searchDetails.transactions && searchDetails.transactions.length > 0) {
            const processedTransactions = searchDetails.transactions.map(t => ({
              ...t,
              id: t.id || Math.random().toString(36).substring(2),
              userEmail,
              // Convert timestamp from API to proper Date object
              timestamp: new Date(t.timestamp),
              // Add processed fields
              location: identifyPsuLocation(t.location),
              ...categorizePsuTransaction(t.location || '', Math.abs(t.amount || 0))
            }));
            
            allTransactions.push(...processedTransactions);
            console.log(`Added ${processedTransactions.length} transactions from search`);
          } else {
            console.log(`No transactions found in search details for ${userEmail}`);
          }
        } else {
          console.log(`No searches found for ${userEmail}`);
        }
      }
      
      if (allTransactions.length > 0) {
        console.log(`Total transactions found: ${allTransactions.length}`);
        
        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB - dateA; // Descending order
        });
        
        setTransactions(allTransactions);
      } else {
        console.log('No transactions found for any selected users');
        setTransactions([]);
        setError('No transactions found for the selected PSU accounts');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(`Failed to fetch transaction data: ${err.message}`);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };
  
  fetchTransactions();
}, [selectedUsers]);

  // Render Loading State
  if (loading || userDataLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <CircleDashed className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-white">Loading your spending data...</span>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
          <h2 className="text-xl font-bold flex items-center mb-2">
            <AlertCircle className="mr-2 h-5 w-5" /> Error Loading Data
          </h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <h1 className="text-2xl font-bold text-white">Your Spending Trends</h1>
        
        <div className="flex flex-wrap gap-3 items-center">
          {/* PSU User Selection */}
          {availableUsers.length > 0 ? (
            <div className="relative">
              <select
                value={selectedUsers.length === 1 ? selectedUsers[0] : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedUsers([e.target.value]);
                    console.log(`Selected user: ${e.target.value}`);
                  }
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-gray-300 focus:outline-none focus:border-indigo-500 appearance-none pr-8"
              >
                {availableUsers.map(user => (
                  <option key={user.email} value={user.email}>
                    {user.email}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 px-4 py-2 rounded-lg text-gray-400 text-sm">
              No PSU accounts available
            </div>
          )}
          
          {/* Time frame selector */}
          <div className="bg-gray-800 rounded-lg overflow-hidden flex divide-x divide-gray-700">
            {['week', 'month', 'semester', 'all'].map((period) => (
              <button
                key={period}
                onClick={() => {
                  setSelectedTimeFrame(period);
                  console.log(`Selected time frame: ${period}`);
                }}
                className={`px-3 py-2 ${
                  selectedTimeFrame === period 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Export button */}
          {filteredTransactions.length > 0 && (
            <button
              onClick={exportTransactionsCSV}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg flex items-center"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
          )}
        </div>
      </div>
      
{/* Data summary */}
{analytics && (
  <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-4 text-indigo-100 flex flex-wrap justify-between items-center">
    <div className="flex items-center">
      <PieChartIcon className="h-5 w-5 mr-2 text-indigo-400" />
      <span>
        Analyzing <strong>{filteredTransactions.length}</strong> transactions
        {selectedTimeFrame !== 'all' && ` from the past ${selectedTimeFrame}`}
        {selectedUsers.length > 0 && (
          <span className="ml-1">
            for <strong>{selectedUsers[0]}</strong>
          </span>
        )}
      </span>
    </div>
    
    <div className="flex gap-4 text-sm mt-2 md:mt-0">
      <span className="flex items-center">
        <DollarSign className="h-4 w-4 mr-1 text-green-400" />
        Total: {formatCurrency(analytics.totalSpending)}
      </span>
      
      <span className="flex items-center">
        <Calendar className="h-4 w-4 mr-1 text-blue-400" />
        Daily avg: {formatCurrency(analytics.averageDaily)}
      </span>
    </div>
  </div>
)}

    {/* Meal Plan Settings Section */}
    <CollapsibleSection 
        title="Meal Plan Settings"
        icon={Wallet}
        initiallyOpen={true}
      >
        {updateSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded-lg text-green-500">
            Settings updated successfully!
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-6">
          <MealPlanSettingsForm
            currentBalance={currentBalance}
            mealPlanType={mealPlanType}
            onUpdate={handleMealPlanUpdate}
            planOptions={MEAL_PLANS}
          />
          
          <div className="bg-gray-700 p-6 rounded-lg flex-1">
            {mealPlanType && MEAL_PLANS[mealPlanType] ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{MEAL_PLANS[mealPlanType].name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{MEAL_PLANS[mealPlanType].description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Semester Cost</p>
                    <p className="text-white font-medium">${MEAL_PLANS[mealPlanType].cost.toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-gray-300">Current Balance</p>
                    <p className="text-white font-bold text-xl">${currentBalance.toLocaleString()}</p>
                  </div>
                  
                  {burnRate && (
                    <>
                      <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            burnRate.riskLevel === 'high' 
                              ? 'bg-red-500' 
                              : burnRate.riskLevel === 'medium' 
                                ? 'bg-yellow-500' 
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, (MEAL_PLANS[mealPlanType].value - currentBalance) / MEAL_PLANS[mealPlanType].value * 100)}%` }}
                        ></div>
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Recommended Daily Budget</span>
                          <span className="text-white">${burnRate.dailyBudget.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Projected to Last</span>
                          <span className="text-white">{burnRate.daysRemaining} days</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Estimated Empty Date</span>
                          <span className="text-white">{burnRate.projectedEndDate.toLocaleDateString()}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Risk Level</span>
                          <span className={`font-medium ${
                            burnRate.riskLevel === 'high' 
                              ? 'text-red-400' 
                              : burnRate.riskLevel === 'medium' 
                                ? 'text-yellow-400' 
                                : 'text-green-400'
                          }`}>
                            {burnRate.riskLevel.charAt(0).toUpperCase() + burnRate.riskLevel.slice(1)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                  <p>Please select a meal plan type</p>
                  <p className="text-sm mt-2">Update your settings to see detailed information</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Show empty state with more context */}
      {!loading && !error && (!transactions || transactions.length === 0) && (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-gray-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Transaction Data Available</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            To see your spending trends, please go to the Dashboard and fetch your transaction data from Penn State.
          </p>
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {/* Show analytics only when we have data */}
      {!loading && !error && transactions.length > 0 && analytics && (
        <>
          {/* Navigation Tabs */}
          <div className="bg-gray-800 rounded-lg mb-6 overflow-hidden">
            <div className="flex border-b border-gray-700">
              <TabButton 
                active={selectedTab === 'dashboard'} 
                label="Dashboard" 
                icon={LayoutDashboard}
                onClick={() => setSelectedTab('dashboard')} 
              />
              <TabButton 
                active={selectedTab === 'locations'} 
                label="Locations" 
                icon={MapPin}
                onClick={() => setSelectedTab('locations')} 
              />
              <TabButton 
                active={selectedTab === 'patterns'} 
                label="Patterns" 
                icon={BarChart2}
                onClick={() => setSelectedTab('patterns')} 
              />
              <TabButton 
                active={selectedTab === 'suggestions'} 
                label="Suggestions" 
                icon={Sparkles}
                onClick={() => setSelectedTab('suggestions')} 
              />
            </div>
          </div>
        
          {/* Dashboard Tab */}
          {selectedTab === 'dashboard' && (
            <>
              {/* Spending Predictions */}
              <CollapsibleSection 
                title="Spending Predictions & Analysis"
                icon={TrendingUp}
                initiallyOpen={true}
              >
                {currentBalance > 0 ? (
                  <SpendingPredictions 
                    transactions={filteredTransactions}
                    currentBalance={currentBalance}
                    mealPlanType={mealPlanType}
                  />
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 text-yellow-500 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p>Please update your current balance in the Meal Plan Settings section to see spending predictions.</p>
                  </div>
                )}
              </CollapsibleSection>
          
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard 
                  icon={DollarSign} 
                  label="Total Spending" 
                  value={formatCurrency(analytics.totalSpending)}
                  color="green"
                />
                <StatCard 
                  icon={TrendingUp}
                  label="Avg Transaction" 
                  value={formatCurrency(analytics.averageTransaction)}
                  color="blue"
                />
                <StatCard 
                  icon={Clock}
                  label="Busiest Day" 
                  value={analytics.busiestDay}
                  color="purple"
                />
                <StatCard 
                  icon={Calendar}
                  label="Top Category" 
                  value={analytics.topCategory}
                  color="orange"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Daily Spending Pattern */}
                <div className="bg-gray-800 p-6 rounded-lg h-[400px]">
                  <h2 className="text-lg font-semibold text-white mb-4">Daily Spending Pattern</h2>
                  <ResponsiveContainer width="100%" height="90%">
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
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Spending by Category */}
                <div className="bg-gray-800 p-6 rounded-lg h-[400px]">
                  <h2 className="text-lg font-semibold text-white mb-4">Spending by Category</h2>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics.categoryBreakdown)
                          .map(([name, value]) => ({
                            name,
                            value
                          }))
                          .filter(item => item.value > 0)
                        }
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={130}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(analytics.categoryBreakdown)
                          .filter(([, value]) => value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))
                        }
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Discount Analysis */}
              <CollapsibleSection 
                title="Discount Analysis"
                icon={DollarSign}
                initiallyOpen={false}
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-white font-medium text-sm mb-2">Discount Utilization</h3>
                      <div className="h-2 bg-gray-600 rounded-full mb-4 overflow-hidden">
                        <div 
                          className="h-full bg-green-500"
                          style={{ width: `${analytics.discountStats.percentDiscounted}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">
                          {formatPercent(analytics.discountStats.percentDiscounted)}
                        </span>
                        <span className="text-white font-medium">
                          {formatCurrency(analytics.discountStats.discountedSpending)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-white font-medium text-sm mb-1">Actual Savings</h3>
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(analytics.discountStats.actualSavings)}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Saved through 65% dining commons discount
                      </p>
                    </div>

                    <div className="bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-white font-medium text-sm mb-1">Potential Savings</h3>
                      <p className="text-2xl font-bold text-indigo-400">
                        {formatCurrency(analytics.discountStats.potentialSavings)}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Additional savings if all spending was discounted
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-700 p-4 rounded-lg space-y-2">
                    <h3 className="text-white font-medium mb-3">How Penn State Meal Plan Discounts Work</h3>
                    <p className="text-gray-300 text-sm">
                      The Campus Meal Plan offers a <span className="text-green-400 font-medium">65% discount</span> at all five dining commons locations (East, North, South, West, and Pollock). 
                    </p>
                    <p className="text-gray-300 text-sm">
                      No discounts are applied at markets, convenience stores, or HUB dining locations when using the meal plan.
                    </p>
                    <p className="text-gray-300 text-sm">
                      For locations without meal plan discounts, using LionCash provides a <span className="text-green-400 font-medium">10% discount</span> at most dining locations.
                    </p>
                  </div>
                </div>
              </CollapsibleSection>
            </>
          )}

          {/* Locations Tab */}
          {selectedTab === 'locations' && (
            <>
              {/* Category Filter */}
              <div className="bg-gray-800 p-4 rounded-lg mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Filter className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-white font-medium">Filter by Category</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        selectedCategory === category
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {category === 'all' ? 'All Categories' : category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Locations */}
              <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Top Spending Locations</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analytics.topLocations.map((location, index) => (
                    <div key={location.name} className="bg-gray-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="bg-gray-600 w-8 h-8 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{location.name}</p>
                            <p className="text-indigo-400 text-lg mt-1">
                              {formatCurrency(location.amount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Map */}
              <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-white">Campus Spending Map</h2>
                  <InfoTooltip 
                    label="Campus Areas"
                    tooltip="This visualization shows your spending across different campus areas. Larger circles indicate higher spending."
                  />
                </div>
                <div className="h-[300px] bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-10 w-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Campus map visualization coming soon</p>
                    <p className="text-sm text-gray-500 mt-1">Interactive campus map with spending heatmap</p>
                  </div>
                </div>
              </div>

              {/* Meal Time Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(analytics.mealPreferences).map(([mealTime, preferences]) => {
                  const IconComponent = 
                    mealTime === 'breakfast' ? Coffee :
                    mealTime === 'lateNight' ? Moon : Utensils;
                  
                  if (!preferences || preferences.length === 0) return null;
                  
                  return (
                    <div key={mealTime} className="bg-gray-800 p-6 rounded-lg">
                      <div className="flex items-center mb-4">
                        <IconComponent className="h-6 w-6 text-indigo-400" />
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
                                <p className="text-indigo-400">{formatCurrency(pref.averageSpent)}</p>
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

          {/* Patterns Tab */}
          {selectedTab === 'patterns' && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <StatCard 
                  icon={Calendar} 
                  label="Active Days" 
                  value={analytics.stats.totalDays.toString()}
                  color="indigo"
                />
                <StatCard 
                  icon={Utensils} 
                  label="Meals" 
                  value={analytics.stats.mealCount.toString()}
                  color="green"
                />
                <StatCard 
                  icon={Coffee} 
                  label="Coffee/Snacks" 
                  value={analytics.stats.snackCount.toString()}
                  color="orange"
                />
                <StatCard 
                  icon={MapPin} 
                  label="Unique Locations" 
                  value={analytics.stats.uniqueLocations.toString()}
                  color="blue"
                />
                <StatCard 
                  icon={Clock} 
                  label="Busiest Hour" 
                  value={`${analytics.busiestHour}:00`}
                  color="purple"
                />
              </div>

              {/* Hourly Spending Pattern */}
              <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Hourly Spending Pattern</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#9CA3AF"
                      tick={{fontSize: 12}}
                      tickFormatter={(hour) => hour.split(':')[0]}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stackId="2"
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Spending Pattern */}
              <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Weekly Spending Pattern</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="week" 
                      stroke="#9CA3AF"
                      tick={{fontSize: 12}}
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Payment Methods */}
              <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Spending by Payment Method</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={Object.entries(analytics.spendingByPaymentMethod)
                            .map(([name, value]) => ({
                              name,
                              value
                            }))
                          }
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(analytics.spendingByPaymentMethod)
                            .map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))
                          }
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                          formatter={(value) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(analytics.spendingByPaymentMethod).map(([method, amount], index) => (
                      <div key={method} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          ></div>
                          <span className="text-white">{method}</span>
                        </div>
                        <span className="text-gray-300">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Suggestions Tab */}
          {selectedTab === 'suggestions' && (
            <>
              <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="bg-indigo-800/50 p-3 rounded-lg mr-3">
                    <Sparkles className="h-5 w-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">Personalized Recommendations</h3>
                    <p className="text-indigo-200 text-sm">
                      Based on your spending patterns, we've generated tailored suggestions to help you maximize your meal plan value.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {savingsRecommendations.map((rec, index) => (
                  <SavingTip
                    key={rec.id || index}
                    icon={rec.icon}
                    title={rec.title}
                    description={rec.description}
                  />
                ))}
              </div>

              {/* Penn State Special Features */}
              <CollapsibleSection
                title="Penn State Dining Updates (2024-2025)"
                icon={Leaf}
                initiallyOpen={false}
              >
                <div className="space-y-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2">New Trayless Dining Initiative</h3>
                    <p className="text-gray-300 text-sm">
                      Penn State has implemented trayless dining across all commons locations to reduce food waste and promote sustainable practices. This initiative is expected to save thousands of gallons of water and reduce food waste significantly.
                    </p>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2">New Dining Locations</h3>
                    <p className="text-gray-300 text-sm mb-3">
                      Check out these new dining options across campus:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-600 p-3 rounded-lg">
                        <p className="text-white text-sm font-medium">State Chik'n</p>
                        <p className="text-gray-400 text-xs">New specialty chicken spot</p>
                      </div>
                      <div className="bg-gray-600 p-3 rounded-lg">
                        <p className="text-white text-sm font-medium">Aloha Fresh</p>
                        <p className="text-gray-400 text-xs">Hawaiian-inspired cuisine</p>
                      </div>
                      <div className="bg-gray-600 p-3 rounded-lg">
                        <p className="text-white text-sm font-medium">East Philly Cheesesteaks</p>
                        <p className="text-gray-400 text-xs">Authentic Philadelphia-style cheesesteaks</p>
                      </div>
                      <div className="bg-gray-600 p-3 rounded-lg">
                        <p className="text-white text-sm font-medium">Dear Joe: Café and Bakery</p>
                        <p className="text-gray-400 text-xs">Specialty coffee and fresh-baked goods</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Updated Meal Plan Rates (2024-2025)</h3>
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800">
                          <tr>
                            <th className="px-4 py-2">Plan</th>
                            <th className="px-4 py-2">Cost</th>
                            <th className="px-4 py-2">Value</th>
                            <th className="px-4 py-2">Recommended For</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(MEAL_PLANS).filter(([key]) => key !== 'custom').map(([key, plan]) => (
                            <tr key={key} className="bg-gray-600 border-b border-gray-700">
                              <td className="px-4 py-2 font-medium">{plan.name}</td>
                              <td className="px-4 py-2">${plan.cost.toLocaleString()}</td>
                              <td className="px-4 py-2">${plan.value.toLocaleString()}</td>
                              <td className="px-4 py-2">
                                {plan.description.split('.')[0]}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </>
          )}
        </>
      )}
    </div>
  );
}