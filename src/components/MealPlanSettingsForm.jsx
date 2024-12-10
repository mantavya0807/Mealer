import React, { useState } from 'react';

const MealPlanSettingsForm = ({ 
  currentBalance, 
  mealPlanType, 
  onUpdate,
  className = '' 
}) => {
  const [balance, setBalance] = useState(currentBalance?.toString() || '');
  const [planType, setPlanType] = useState(mealPlanType || '');
  const [error, setError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowSuccess(false);

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
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update meal plan settings');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`${className} bg-gray-800 p-6 rounded-lg max-w-md w-full`}>
      <h2 className="text-xl font-bold text-white mb-4">Meal Plan Settings</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded">
            {error}
          </div>
        )}
        
        {showSuccess && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded">
            Settings updated successfully!
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Current Balance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-7 py-2 text-white focus:outline-none focus:border-blue-500"
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
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a meal plan</option>
            <option value="level1">Level 1 ($2000/semester)</option>
            <option value="level2">Level 2 ($2800/semester)</option>
            <option value="level3">Level 3 ($3500/semester)</option>
            <option value="commuter">Commuter ($500/semester)</option>
            <option value="custom">Custom Plan</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={isUpdating}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white py-2 px-4 rounded"
        >
          {isUpdating ? 'Updating...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};

export default MealPlanSettingsForm;