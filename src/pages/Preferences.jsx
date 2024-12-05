// src/pages/Preferences.jsx
import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { auth } from '../firebase/config';
import { saveUserPreferences, getUserPreferences, deleteUserAccount } from '../firebase/userDb'; // Ensure deleteUserAccount is implemented

export default function Preferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [preferences, setPreferences] = useState({
    placesToAvoid: [],
    dietaryRestrictions: [],
    mealsPerDay: 3,
    calorieTarget: 2000,
    deleteAccount: false
  });
  const [originalPreferences, setOriginalPreferences] = useState(null);

  const handleDietaryToggle = (optionId) => {
    setPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(optionId)
        ? prev.dietaryRestrictions.filter(id => id !== optionId)
        : [...prev.dietaryRestrictions, optionId]
    }));
  };

  const handleLocationToggle = (locationId) => {
    setPreferences(prev => ({
      ...prev,
      placesToAvoid: prev.placesToAvoid.includes(locationId)
        ? prev.placesToAvoid.filter(id => id !== locationId)
        : [...prev.placesToAvoid, locationId]
    }));
  };

  const locations = [
    { id: 'east', name: 'East' },
    { id: 'west', name: 'West' },
    { id: 'north', name: 'North' },
    { id: 'south', name: 'South' },
    { id: 'pollock', name: 'Pollock' }
  ];

  const dietaryOptions = [
    { id: 'vegan', name: 'Vegan' },
    { id: 'vegetarian', name: 'Vegetarian' },
    { id: 'gluten-free', name: 'Gluten Free' },
    { id: 'halal', name: 'Halal' },
    { id: 'kosher', name: 'Kosher' }
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      if (!auth.currentUser) return;
      const userPrefs = await getUserPreferences(auth.currentUser.uid);
      if (userPrefs) {
        setPreferences(userPrefs);
        setOriginalPreferences(userPrefs);
      }
    } catch (err) {
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      if (!auth.currentUser) throw new Error('No user logged in');

      await saveUserPreferences(auth.currentUser.uid, preferences);
      setSuccessMessage('Preferences saved successfully!');
      setOriginalPreferences(preferences);
    } catch (err) {
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalPreferences) {
      setPreferences(originalPreferences);
      setSuccessMessage('Preferences have been reset.');
      setError('');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        await deleteUserAccount(auth.currentUser.uid);
        auth.signOut();
        // Redirect or inform the user
      } catch (err) {
        setError('Failed to delete account');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        <div className="flex items-center justify-center">
          Loading preferences...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-gray-300">
      <h1 className="text-2xl font-bold text-white mb-6">Preferences</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500 rounded-lg text-green-500">
          {successMessage}
        </div>
      )}
      
      <div className="space-y-8">
        {/* Places to Avoid */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Places to Avoid</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {locations.map((location) => (
              <label 
                key={location.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={preferences.placesToAvoid.includes(location.id)}
                  onChange={() => handleLocationToggle(location.id)}
                  className="form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-600 bg-gray-700"
                />
                <span>{location.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Dietary Restrictions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {dietaryOptions.map((option) => (
              <label 
                key={option.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={preferences.dietaryRestrictions.includes(option.id)}
                  onChange={() => handleDietaryToggle(option.id)}
                  className="form-checkbox h-4 w-4 text-indigo-600 rounded border-gray-600 bg-gray-700"
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Meal Preferences */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Meal Preferences</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Meals per Day
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={preferences.mealsPerDay}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  mealsPerDay: Number(e.target.value)
                }))}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 w-full max-w-xs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Daily Calorie Target
              </label>
              <input
                type="number"
                step="100"
                min="1000"
                max="5000"
                value={preferences.calorieTarget}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  calorieTarget: Number(e.target.value)
                }))}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 w-full max-w-xs"
              />
            </div>
          </div>
        </div>

        {/* Save and Reset Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-md text-white bg-gray-600 hover:bg-gray-700"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-md text-white ${
              saving 
                ? 'bg-indigo-700 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>

        {/* Delete Account */}
        <div className="bg-red-900/20 border border-red-500 p-6 rounded-lg">
          <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Danger Zone
          </h2>
          <p className="text-gray-400 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
            onClick={handleDeleteAccount}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}