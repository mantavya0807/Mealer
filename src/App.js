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
      </Routes>
    </Router>
  );
}

export default App;