// src/pages/SpendingPredictionsPage.jsx
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { Sparkles, TrendingUp, RefreshCw, AlertTriangle, DollarSign, ChevronDown } from 'lucide-react';
import SpendingPredictions from '../components/predictions/SpendingPredictions';
import MealPlanSettingsForm from '../components/MealPlanSettingsForm';

export default function SpendingPredictionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(500); // Default value
  const [mealPlanType, setMealPlanType] = useState('level2'); // Default value
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const db = getFirestore();

  // Fetch available PSU users
  useEffect(() => {
    const fetchAvailablePSUUsers = async () => {
      try {
        setLoading(true);
        // Fetch all searches first
        const response = await fetch(
          'http://127.0.0.1:5001/meal-plan-optimizer/us-central1/api/searches'
        );
    
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
    
        const data = await response.json();
        console.log('Searches data:', data);
        
        // Extract unique PSU emails from searches
        const uniquePsuEmails = new Set(
          data.searches.map(search => search.psuEmail)
        );
    
        // Convert to format for dropdown
        const psuUsers = Array.from(uniquePsuEmails).map(email => ({
          id: email,
          email: email
        }));
    
        console.log('Found PSU users:', psuUsers);
    
        if (psuUsers.length > 0) {
          setAvailableUsers(psuUsers);
          // Set the first user as selected or the current user if they exist in the list
          const currentUserEmail = auth.currentUser?.email;
          const userExists = psuUsers.some(user => user.email === currentUserEmail);
          
          if (userExists) {
            setSelectedUsers([currentUserEmail]);
          } else {
            setSelectedUsers([psuUsers[0].email]);
          }
        } else {
          console.log('No PSU users found');
          setError('No Penn State users found in the database');
        }
      } catch (err) {
        console.error('Error fetching PSU users:', err);
        setError('Failed to load available PSU users');
      }
    };
    
    fetchAvailablePSUUsers();
  }, []);

  // Fetch transactions and user settings whenever selected users change
  useEffect(() => {
    const fetchUserData = async () => {
      if (!selectedUsers.length) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching data for users:', selectedUsers);
        
        // We'll just use the first selected user for settings
        const userEmail = selectedUsers[0];
        
        // Try to get user settings
        try {
          const userDocRef = doc(db, 'users', userEmail);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentBalance(userData.currentBalance || 500);
            setMealPlanType(userData.mealPlanType || 'level2');
            console.log("User data loaded:", userData);
          }
        } catch (settingsError) {
          console.warn('Could not fetch user settings:', settingsError);
          // Continue with defaults
        }
        
        const allTransactions = [];
        
        // Fetch transactions for each selected user
        for (const userEmail of selectedUsers) {
          const userTransactionsRef = collection(db, 'users', userEmail, 'transactions');
          const snapshot = await getDocs(userTransactionsRef);
          
          console.log(`Found ${snapshot.size} transactions for ${userEmail}`);
          
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
        
        // Sort transactions by date (most recent first)
        allTransactions.sort((a, b) => b.timestamp - a.timestamp);
        
        console.log('Total transactions loaded:', allTransactions.length);
        setTransactions(allTransactions);
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to fetch user data');
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [selectedUsers, db]);

  const handleMealPlanUpdate = async (settings) => {
    try {
      setCurrentBalance(settings.currentBalance);
      setMealPlanType(settings.mealPlanType);
      
      // Update settings in Firestore if we have a selected user
      if (selectedUsers.length > 0) {
        const userEmail = selectedUsers[0];
        const userDocRef = doc(db, 'users', userEmail);
        
        await setDoc(userDocRef, {
          currentBalance: settings.currentBalance,
          mealPlanType: settings.mealPlanType,
          lastUpdated: new Date()
        }, { merge: true });
        
        console.log('Updated settings for user:', userEmail);
      }
      
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      return true;
    } catch (err) {
      console.error('Error updating meal plan settings:', err);
      return false;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-indigo-400" />
            AI Spending Predictions
          </h1>
          <p className="text-gray-400 mt-1">
            Get personalized spending predictions and financial insights powered by machine learning
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* User selection dropdown */}
          {availableUsers.length > 0 && (
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
          )}
          
          <button 
            onClick={() => {
              if (selectedUsers.length > 0) {
                // Re-trigger the useEffect by setting the same selected users
                const currentSelected = [...selectedUsers];
                setSelectedUsers([]);
                setTimeout(() => setSelectedUsers(currentSelected), 10);
              }
            }} 
            className="bg-gray-800 p-2 rounded-lg text-gray-300 hover:bg-gray-700"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          <p className="font-medium flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </p>
        </div>
      )}

      {updateSuccess && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg text-green-500">
          <p className="font-medium">Meal plan settings updated successfully!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meal Plan Settings */}
        <div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-indigo-400" />
              Meal Plan Settings
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Update your current balance to receive accurate predictions
            </p>
            <MealPlanSettingsForm
              currentBalance={currentBalance}
              mealPlanType={mealPlanType}
              onUpdate={handleMealPlanUpdate}
            />
          </div>

          {/* Explanation */}
          <div className="bg-indigo-900/20 p-6 border border-indigo-500/30 rounded-lg">
            <h3 className="text-white font-medium mb-2 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-indigo-400" />
              How It Works
            </h3>
            <p className="text-gray-300 text-sm mb-3">
              Our AI analyzes your transaction history to predict:
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <span className="inline-block h-5 w-5 rounded-full bg-indigo-500/20 text-center text-indigo-400 mr-2">1</span>
                <span>When your meal plan funds will run out</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block h-5 w-5 rounded-full bg-indigo-500/20 text-center text-indigo-400 mr-2">2</span>
                <span>Weekly and daily spending patterns</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block h-5 w-5 rounded-full bg-indigo-500/20 text-center text-indigo-400 mr-2">3</span>
                <span>Personalized recommendations to make your meal plan last longer</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Spending Predictions */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-gray-800 p-6 rounded-lg flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
              <span className="ml-3 text-gray-300">Loading your predictions...</span>
            </div>
          ) : (
            <>
              {transactions.length === 0 ? (
                <div className="bg-gray-800 p-8 rounded-lg text-center">
                  <TrendingUp className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">No Transaction Data Available</h2>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">
                    To get spending predictions, you need to use your meal plan first. Go to the Dashboard to fetch your transaction data.
                  </p>
                  <button 
                    onClick={() => window.location.href = '/dashboard'} 
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                <SpendingPredictions
                  transactions={transactions}
                  currentBalance={currentBalance}
                  mealPlanType={mealPlanType}
                  className="w-full"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}