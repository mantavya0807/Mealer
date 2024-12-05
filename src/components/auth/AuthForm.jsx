import { useState } from 'react';
import { User, Lock, Mail, UserPlus } from 'lucide-react';
import { auth } from '../../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function AuthForm() {
  const navigate = useNavigate();
  const [isSignIn, setIsSignIn] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setError('');
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (!isSignIn) {
        // Sign Up
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      } else {
        // Sign In
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="backdrop-blur-xl bg-white/10 p-8 rounded-2xl shadow-xl">
        <div className="flex justify-between mb-8">
          <button 
            className={`text-sm font-medium px-4 py-2 rounded-lg ${isSignIn ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setIsSignIn(true)}
          >
            Sign In
          </button>
          <button 
            className={`text-sm font-medium px-4 py-2 rounded-lg ${!isSignIn ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setIsSignIn(false)}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isSignIn && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-200">Name</label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserPlus className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-lg bg-gray-800 border border-gray-700 pl-10 px-3 py-2 text-gray-200 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Your full name"
                  required={!isSignIn}
                />
              </div>
            </div>
          )}

          <div className="relative">
            <label className="block text-sm font-medium text-gray-200">Email</label>
            <div className="mt-1 relative rounded-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="block w-full rounded-lg bg-gray-800 border border-gray-700 pl-10 px-3 py-2 text-gray-200 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-200">Password</label>
            <div className="mt-1 relative rounded-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="block w-full rounded-lg bg-gray-800 border border-gray-700 pl-10 px-3 py-2 text-gray-200 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {!isSignIn && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-200">Confirm Password</label>
              <div className="mt-1 relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full rounded-lg bg-gray-800 border border-gray-700 pl-10 px-3 py-2 text-gray-200 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="••••••••"
                  required={!isSignIn}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isSignIn ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}