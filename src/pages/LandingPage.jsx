// src/pages/LandingPage.jsx
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import AuthForm from '../components/auth/AuthForm';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check if user document exists in Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (!userDoc.exists()) {
            // If no user document found, sign out and show error
            await auth.signOut();
            setAuthError('Account not found. Please sign up to continue.');
          } else {
            // If user document exists, redirect to dashboard
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Error checking user document:', error);
          setAuthError('An error occurred. Please try again.');
        }
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative isolate px-6 lg:px-8">
        <div className="absolute inset-x-0 -top-40 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
          <div className="relative left-[50%] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-purple-500 to-cyan-400 opacity-30"></div>
        </div>
        
        <div className="mx-auto max-w-6xl py-32 sm:py-48 lg:py-16">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
            {/* Left side - Hero content */}
            <div className="text-center lg:text-left lg:w-1/2">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
                Optimize Your Penn State Meal Plan
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Track your dining dollars, analyze spending patterns, and make the most of your meal plan with our smart optimization tools.
              </p>
            </div>

            {/* Right side - Auth form */}
            <div className="w-full lg:w-1/2">
              {authError && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
                  {authError}
                </div>
              )}
              <AuthForm 
                onError={(error) => setAuthError(error)} 
                clearError={() => setAuthError('')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}