import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  DollarSign, 
  Wallet, 
  Clock, 
  Loader,
  Info,
  CheckCircle,
  Shield,
  TrendingUp
} from 'lucide-react';
import { auth } from '../firebase/config';
import LoadingGames from '../components/loading/LoadingGames';


export default function Dashboard() {
  const [psuCredentials, setPsuCredentials] = useState({
    email: '',
    password: '',
    verificationCode: ''
  });
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [showLoadingGame, setShowLoadingGame] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const validatePSUEmail = (email) => {
    const psuPattern = /^[a-zA-Z]{3}\d{4}@psu\.edu$/;
    return psuPattern.test(email);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Remove any whitespace for email and verification code
    const cleanValue = name === 'email' || name === 'verificationCode' ? value.trim() : value;
    setPsuCredentials(prev => ({ ...prev, [name]: cleanValue }));

    if (name === 'email') {
      if (cleanValue && !validatePSUEmail(cleanValue)) {
        setEmailError('Email must be in format: abc1234@psu.edu');
      } else {
        setEmailError('');
      }
    }

    if (name === 'verificationCode') {
      // Only allow numbers
      if (!/^\d*$/.test(cleanValue)) {
        return;
      }
      if (cleanValue.length === 6) {
        setError('');
      }
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setError('');
    setEmailError('');

    // Validate all fields
    if (!psuCredentials.email || !psuCredentials.password || !psuCredentials.verificationCode) {
      setError('Please fill in all fields');
      return;
    }

    // Validate email
    if (!validatePSUEmail(psuCredentials.email)) {
      setEmailError('Please enter a valid PSU email');
      return;
    }

    // Validate verification code
    if (psuCredentials.verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      return;
    }

    // Validate dates
    if (!dateRange.from || !dateRange.to) {
      setError('Please select both from and to dates');
      return;
    }

    setShowLoadingGame(true);
    setLoading(true);

    try {
      const requestBody = {
        psuEmail: psuCredentials.email,
        password: psuCredentials.password,
        verificationCode: psuCredentials.verificationCode,
        fromDate: formatDate(dateRange.from),
        toDate: formatDate(dateRange.to)
      };

      console.log('Sending request with:', {
        ...requestBody,
        password: '[REDACTED]'
      });

      const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setShowLoadingGame(false);
        
        // Wait a bit to show success message, then navigate
        setTimeout(() => {
          navigate('/past-searches');
        }, 2000);
      } else if (data.requiresVerification) {
        setRequiresVerification(true);
        setError('Verification code required.');
        setShowLoadingGame(false);
      } else {
        setError(data.message || 'Login failed. Please try again.');
        setShowLoadingGame(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to connect to PSU services.');
      setShowLoadingGame(false);
    } finally {
      setLoading(false);
    }
  };

  const userDisplayName = auth.currentUser?.displayName || auth.currentUser?.email || 'User';

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Loading Game Overlay */}
      {showLoadingGame && (
        <div className="fixed inset-0 bg-gray-900/90 z-50 flex items-center justify-center">
          <LoadingGames 
            onQuit={() => {
              setShowLoadingGame(false);
              setLoading(false);
            }} 
          />
        </div>
      )}

      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-800 to-blue-700 rounded-xl shadow-xl p-8 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome, {userDisplayName}</h1>
            <p className="text-indigo-200">Access and analyze your Penn State meal plan data</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center bg-white/10 px-4 py-2 rounded-lg">
            <Shield className="h-5 w-5 text-indigo-200 mr-2" />
            <span className="text-indigo-100 text-sm">Secure MFA Authentication</span>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500 p-5 rounded-xl flex items-center space-x-3 shadow-md">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <span className="text-green-500 font-medium">Data successfully scraped! Redirecting to search results...</span>
        </div>
      )}

      {/* PSU Credentials Form */}
      <div className="bg-gray-800 p-8 rounded-xl shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
          <User className="h-6 w-6 mr-2 text-indigo-400" />
          Penn State Account Details
        </h2>
        
        {/* Verification Code Warning */}
        {!requiresVerification && (
          <div className="mb-8 bg-blue-900/30 border border-blue-500 p-5 rounded-lg flex items-start space-x-4">
            <Info className="h-6 w-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-blue-200">
              <p className="font-medium mb-1">Verification Code Timing</p>
              <p className="text-sm">
                Please ensure your Microsoft Authenticator code has at least 15 seconds remaining before submitting. 
                The code refreshes every 30 seconds.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email and Password/Code Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Penn State Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  className={`pl-10 block w-full rounded-lg bg-gray-700 border ${
                    emailError ? 'border-red-500' : 'border-gray-600'
                  } text-white py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition`}
                  placeholder="abc1234@psu.edu"
                  value={psuCredentials.email}
                  onChange={handleInputChange}
                />
              </div>
              {emailError && (
                <p className="mt-2 text-sm text-red-500">{emailError}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  className="block w-full rounded-lg bg-gray-700 border-gray-600 text-white py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  value={psuCredentials.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Microsoft Authenticator Code
                  <span className="text-yellow-400 ml-2 text-xs font-normal">
                    (Ensure {'>'} 10s remaining)
                  </span>
                </label>
                <input
                  type="text"
                  name="verificationCode"
                  maxLength="6"
                  pattern="\d{6}"
                  className={`block w-full rounded-lg bg-gray-700 border ${
                    psuCredentials.verificationCode && psuCredentials.verificationCode.length !== 6
                      ? 'border-red-500'
                      : 'border-gray-600'
                  } text-white py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition`}
                  placeholder="Enter 6-digit code"
                  value={psuCredentials.verificationCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="bg-gray-750 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-indigo-400" />
              Transaction Date Range
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">From Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">To Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="pl-10 block w-full rounded-lg bg-gray-700 border-gray-600 text-white py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/15 border border-red-500 rounded-lg text-red-500 flex items-center">
              <div className="mr-3 flex-shrink-0 self-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!emailError}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center shadow-lg transition transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Processing...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </form>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-800 to-blue-900 overflow-hidden shadow-xl rounded-xl">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-xl bg-blue-700 p-4 shadow-inner">
                  <Wallet className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-blue-200 truncate">
                    Current Balance
                  </dt>
                  <dd className="text-3xl font-bold text-white">$1,234</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Budget Card */}
        <div className="bg-gradient-to-br from-green-800 to-green-900 overflow-hidden shadow-xl rounded-xl">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-xl bg-green-700 p-4 shadow-inner">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-green-200 truncate">
                    Recommended Daily Budget
                  </dt>
                  <dd className="text-3xl font-bold text-white">$25</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Days Remaining Card */}
        <div className="bg-gradient-to-br from-purple-800 to-purple-900 overflow-hidden shadow-xl rounded-xl">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-xl bg-purple-700 p-4 shadow-inner">
                  <Clock className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-purple-200 truncate">
                    Days Remaining
                  </dt>
                  <dd className="text-3xl font-bold text-white">45</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional info section */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mt-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="h-6 w-6 mr-2 text-indigo-400" />
          Spending Insights
        </h3>
        <p className="text-gray-300 mb-4">
          Submit your credentials above to access detailed analytics and insights about your spending patterns.
          After processing, you'll be able to see:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg flex items-start">
            <div className="bg-indigo-500/10 p-2 rounded-md mr-3">
              <DollarSign className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Spending Analysis</h4>
              <p className="text-sm text-gray-400">Track where your dining dollars are going</p>
            </div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg flex items-start">
            <div className="bg-green-500/10 p-2 rounded-md mr-3">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h4 className="font-medium text-white">Usage Forecasts</h4>
              <p className="text-sm text-gray-400">Predict when your funds will run out</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}