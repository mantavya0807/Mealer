import React, { useState } from 'react';
import { Info } from 'lucide-react';

const MealPlanSettingsForm = ({ 
  currentBalance, 
  mealPlanType, 
  onUpdate,
  planOptions = {},
  className = '' 
}) => {
  const [balance, setBalance] = useState(currentBalance?.toString() || '');
  const [planType, setPlanType] = useState(mealPlanType || '');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numBalance = parseFloat(balance);
    if (isNaN(numBalance) || numBalance < 0) {
      setError('Please enter a valid balance amount');
      return;
    }

    if (!planType) {
      setError('Please select a meal plan type');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate({
        currentBalance: numBalance,
        mealPlanType: planType
      });
    } catch (err) {
      setError(err.message || 'Failed to update meal plan settings');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`${className} bg-gray-700 p-6 rounded-lg max-w-md w-full`}>
      <h3 className="text-white font-medium mb-4">Update Your Settings</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Current Balance
            <div className="inline-flex items-center ml-2 text-gray-400 text-xs">
              <Info className="h-3.5 w-3.5 mr-1" />
              <span>Enter your remaining meal plan balance</span>
            </div>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-gray-600 border border-gray-500 rounded px-7 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Meal Plan Type
          </label>
          <select
            value={planType}
            onChange={(e) => setPlanType(e.target.value)}
            className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a meal plan</option>
            <option value="level1">Level 1 ($2,500/semester)</option>
            <option value="level2">Level 2 ($3,100/semester)</option>
            <option value="level3">Level 3 ($3,700/semester)</option>
            <option value="commuter">Commuter ($500/semester)</option>
            <option value="custom">Custom Plan</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={isUpdating}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500/50 text-white py-2 px-4 rounded transition-colors"
        >
          {isUpdating ? 'Updating...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default MealPlanSettingsForm;