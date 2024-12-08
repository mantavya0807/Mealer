import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase/config';
import { MultiSelect } from '../components/ui/multi-select';
import { collection, query, getDocs } from 'firebase/firestore';
import { 
  BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Calendar,
  CircleDashed
} from 'lucide-react';
import { all } from 'axios';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#af19ff'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SpendingTrends() {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('monthly');

  /// Fetch all PSU users that have transaction data
useEffect(() => {
  const fetchAvailablePSUUsers = async () => {
    try {
      // Get the users collection
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
// Get all users data from the collection
const allUsers = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
console.log('All users:', allUsers); // Debug log
      // Filter for PSU emails from document IDs
      const psuUsers = allUsers
        .filter(id => id.endsWith('@psu.edu'))
        .map(email => ({
          id: email,
          email: email
        }));
  
      console.log('Found PSU users:', psuUsers); // Debug log
  
      if (psuUsers.length > 0) {
        setAvailableUsers(psuUsers);
        // Set first user as default selected
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

  // Analytics calculations
  const analytics = useMemo(() => {
    if (!transactions.length) return null;

    try {
      // Total spending calculation
      const totalSpending = transactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      const averageTransaction = totalSpending / transactions.length;

      // Daily spending patterns
      const dailySpending = transactions.reduce((acc, t) => {
        const day = DAYS[t.timestamp.getDay()];
        if (!acc[day]) acc[day] = 0;
        acc[day] += Math.abs(t.amount || 0);
        return acc;
      }, {});

      // Category breakdown
      const categoryBreakdown = transactions.reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        if (!acc[category]) acc[category] = 0;
        acc[category] += Math.abs(t.amount || 0);
        return acc;
      }, {});

      // Find busiest day and top category
      const busiestDay = Object.entries(dailySpending)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      const topCategory = Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

      // Location analysis
      const locationSpending = transactions.reduce((acc, t) => {
        const location = t.location || 'Unknown Location';
        if (!acc[location]) acc[location] = 0;
        acc[location] += Math.abs(t.amount || 0);
        return acc;
      }, {});

      const topLocations = Object.entries(locationSpending)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      return {
        totalSpending,
        averageTransaction,
        busiestDay,
        topCategory,
        dailySpending,
        categoryBreakdown,
        topLocations
      };
    } catch (err) {
      console.error('Error calculating analytics:', err);
      return null;
    }
  }, [transactions]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <CircleDashed className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-white">Loading trends...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
        {error}
      </div>
    );
  }

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
      </>
      )}
    </div>
      )
}