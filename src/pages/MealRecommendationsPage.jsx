// src/pages/MealRecommendationsPage.jsx
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { auth } from '../firebase/config';
import { Utensils, RefreshCw, AlertTriangle, User, ChevronDown } from 'lucide-react';
import MealRecommendations from '../components/recommendations/MealRecommendations';

export default function MealRecommendationsPage() {
  const [transactions, setTransactions] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [userPreferences, setUserPreferences] = useState({
    dietaryRestrictions: [],
    placesToAvoid: [],
    cuisinePreferences: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
          'http://127.0.0.1:5000/api/searches'
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailablePSUUsers();
  }, []);

  // Move fetchTransactions into its own function so it can be called by both the useEffect and the button
  const fetchTransactions = async () => {
    if (!selectedUsers.length) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching transactions for users:', selectedUsers);
      const allTransactions = [];

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
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
          };
        });

        allTransactions.push(...userTransactions);
      }
      
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);
      console.log('Total transactions loaded:', allTransactions.length);
      setTransactions(allTransactions);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to fetch transaction data');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions whenever selected users change
  useEffect(() => {
    fetchTransactions();
  }, [selectedUsers, db]);

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center">
            <Utensils className="h-6 w-6 mr-2 text-indigo-400" />
            AI Meal Recommendations
          </h1>
          <p className="text-gray-400 mt-1">
            Get personalized dining suggestions based on your preferences and transaction history
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
            onClick={fetchTransactions} 
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

      {loading ? (
        <div className="bg-gray-800 p-6 rounded-lg flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          <span className="ml-3 text-gray-300">Loading your recommendations...</span>
        </div>
      ) : (
        <>
          {transactions.length === 0 ? (
            <div className="bg-gray-800 p-8 rounded-lg text-center">
              <Utensils className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Transaction Data Available</h2>
              <p className="text-gray-400 max-w-md mx-auto mb-6">
                To get personalized meal recommendations, you need to use your meal plan first. Go to the Dashboard to fetch your transaction data.
              </p>
              <button 
                onClick={() => window.location.href = '/dashboard'} 
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <MealRecommendations
              transactions={transactions}
              userPreferences={userPreferences}
              currentBalance={currentBalance}
              className="w-full"
            />
          )}
        </>
      )}
    </div>
  );
}