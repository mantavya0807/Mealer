import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  AlertTriangle, 
  DollarSign, 
  Wallet, 
  Clock, 
  Loader,
  Info 
} from 'lucide-react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

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

  const navigate = useNavigate();

  const validatePSUEmail = (email) => {
    const psuPattern = /^[a-zA-Z]{3}\d{4}@psu\.edu$/;
    return psuPattern.test(email);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPsuCredentials(prev => ({ ...prev, [name]: value }));

    if (name === 'email') {
      if (value && !validatePSUEmail(value)) {
        setEmailError('Email must be in format: abc1234@psu.edu');
      } else {
        setEmailError('');
      }
    }

    if (name === 'verificationCode' && value.length === 6) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate email
    if (!validatePSUEmail(psuCredentials.email)) {
      setEmailError('Please enter a valid PSU email');
      return;
    }

    // If verification is required, validate verification code
    if (requiresVerification && psuCredentials.verificationCode.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:5001/meal-plan-optimizer/us-central1/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(psuCredentials)
      });

      const data = await response.json();

      if (data.success) {
        // Handle successful login
        console.log('Login successful');
        navigate('/dashboard'); // Redirect to dashboard or desired page
      } else if (data.requiresVerification) {
        setRequiresVerification(true);
        setError('Verification code required. Please enter the code from your authenticator app.');
      } else {
        setError(data.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Failed to connect to PSU services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
    navigate('/');
  };

  const userDisplayName = auth.currentUser?.displayName || auth.currentUser?.email || 'User';

  return (
    <div className="space-y-6">
      {/* User Welcome */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <p className="text-white">
          Welcome, <span className="font-semibold">{userDisplayName}</span>
        </p>
      </div>

      {/* PSU Credentials Form */}
      <div className="bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-white mb-4">Penn State Account Details</h2>
        
        {/* Verification Code Warning */}
        {!requiresVerification && (
          <div className="mb-6 bg-blue-900/30 border border-blue-500 p-4 rounded-lg flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-blue-200">
              <p className="font-medium">Verification Code Timing</p>
              <p className="text-sm mt-1">
                Please ensure your Microsoft Authenticator code has at least 15 seconds remaining before submitting. 
                The code refreshes every 30 seconds.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Penn State Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  className={`pl-10 block w-full rounded-md bg-gray-700 border ${
                    emailError ? 'border-red-500' : 'border-gray-600'
                  } text-white`}
                  placeholder="abc1234@psu.edu"
                  value={psuCredentials.email}
                  onChange={handleInputChange}
                />
              </div>
              {emailError && (
                <p className="mt-1 text-sm text-red-500">{emailError}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
    <input
      type="password"
      name="password"
      className="block w-full rounded-md bg-gray-700 border-gray-600 text-white"
      value={psuCredentials.password}
      onChange={handleInputChange}
      required
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      Microsoft Authenticator Code
      <span className="text-yellow-500 ml-2 text-xs">
        (Ensure '{'>'} 10s remaining)
      </span>
    </label>
    <input
      type="text"
      name="verificationCode"
      maxLength="6"
      pattern="\d{6}"
      className={`block w-full rounded-md bg-gray-700 border ${
        error ? 'border-red-500' : 'border-gray-600'
      } text-white`}
      placeholder="Enter 6-digit code"
      value={psuCredentials.verificationCode}
      onChange={handleInputChange}
      required
    />
  </div>
</div>
          </div>

     

          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">From Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  className="pl-10 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
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
                  className="pl-10 block w-full rounded-md bg-gray-700 border-gray-600 text-white"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !!emailError}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md flex items-center justify-center"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Balance Card */}
        <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-blue-500 p-3">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">
                    Current Balance
                  </dt>
                  <dd className="text-3xl font-semibold text-white">$1,234</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Budget Card */}
        <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-green-500 p-3">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">
                    Recommended Daily Budget
                  </dt>
                  <dd className="text-3xl font-semibold text-white">$25</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Days Remaining Card */}
        <div className="bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-purple-500 p-3">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-400 truncate">
                    Days Remaining
                  </dt>
                  <dd className="text-3xl font-semibold text-white">45</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}