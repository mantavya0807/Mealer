// App.js with ML routes added
import logo from './logo.svg';
import './App.css';
import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import './index.css';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase/config';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import PastSearches from './pages/PastSearches';
import SpendingTrends from './pages/SpendingTrends';
import Preferences from './pages/Preferences';

// Import new ML-powered pages
import MealRecommendationsPage from './pages/MealRecommendationsPage';
import SpendingPredictionsPage from './pages/SpendingPredictionsPage';
import AssistantPage from './pages/AssistantPage';

function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={!user ? <LandingPage /> : <Navigate to="/dashboard" replace />} 
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/past-searches"
          element={
            <ProtectedRoute>
              <PastSearches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trends"
          element={
            <ProtectedRoute>
              <SpendingTrends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/preferences"
          element={
            <ProtectedRoute>
              <Preferences />
            </ProtectedRoute>
          }
        />
        
        {/* ML-Powered Routes */}
        <Route
          path="/meal-recommendations"
          element={
            <ProtectedRoute>
              <MealRecommendationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/spending-predictions"
          element={
            <ProtectedRoute>
              <SpendingPredictionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assistant"
          element={
            <ProtectedRoute>
              <AssistantPage />
            </ProtectedRoute>
          }
        />
        
        {/* Catch-all redirect */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;