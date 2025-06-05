import React, { useState, useEffect } from 'react';
import { Calendar, Coffee, MapPin, Utensils, Moon, Clock, DollarSign, Filter, RefreshCw } from 'lucide-react';
import { MLService } from '../../services/MLServices';

// Default export
export default function MealRecommendations({ 
  transactions = [], 
  userPreferences = null, 
  currentBalance = 0,
  className = ''
}) {


  const [recommendations, setRecommendations] = useState({
    breakfast: [],
    lunch: [],
    dinner: [],
    late_night: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dietaryFilters, setDietaryFilters] = useState([]);
  const [discountOnly, setDiscountOnly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [transactions, userPreferences, dietaryFilters, discountOnly]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (refreshing) {
        // If manually refreshing, show refresh state
        setRefreshing(true);
      }

      // In a real implementation, this would call your backend API
      const response = await fetch('http://127.0.0.1:5000/api/ml/meal-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: localStorage.getItem('userId') || 'guest',
          transactions: transactions,
          preferences: {
            dietary_preferences: dietaryFilters.length > 0 ? dietaryFilters : userPreferences?.dietaryRestrictions || [],
            cuisines_preferred: userPreferences?.cuisinePreferences || [],
            avoid_locations: userPreferences?.placesToAvoid || []
          },
          discount_only: discountOnly
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get meal recommendations');
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
      const localRec = MLService.generateLocalRecommendations(transactions, userPreferences, discountOnly);
      setRecommendations(localRec);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Map meals to their respective icons
  const mealIcons = {
    breakfast: Coffee,
    lunch: Utensils,
    dinner: Utensils,
    late_night: Moon
  };

  // Filter options
  const dietaryOptions = [
    { id: 'vegetarian', label: 'Vegetarian' },
    { id: 'vegan', label: 'Vegan' },
    { id: 'gluten-free', label: 'Gluten Free' },
    { id: 'halal', label: 'Halal' }
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecommendations();
  };

  const toggleDietaryFilter = (filter) => {
    if (dietaryFilters.includes(filter)) {
      setDietaryFilters(dietaryFilters.filter(f => f !== filter));
    } else {
      setDietaryFilters([...dietaryFilters, filter]);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className={`${className} bg-gray-800 p-6 rounded-lg`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Smart Dining Recommendations</h2>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          <p className="ml-3 text-gray-300">Loading your personalized recommendations...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${className} bg-gray-800 p-6 rounded-lg`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-indigo-400" />
          Smart Dining Recommendations
        </h2>
        <button 
          onClick={handleRefresh} 
          className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:bg-gray-600"
          disabled={refreshing}
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
          {error}
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-gray-700 p-4 rounded-lg mb-6">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center">
            <Filter className="h-4 w-4 text-indigo-400 mr-2" />
            <span className="text-sm text-gray-300">Dietary Filters:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map(option => (
              <button
                key={option.id}
                onClick={() => toggleDietaryFilter(option.id)}
                className={`px-3 py-1 text-xs rounded-full ${
                  dietaryFilters.includes(option.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center">
            <button
              onClick={() => setDiscountOnly(!discountOnly)}
              className="flex items-center gap-1 text-xs rounded-full px-3 py-1 bg-gray-600 hover:bg-gray-500"
            >
              <DollarSign className="h-3 w-3" />
              <span className={discountOnly ? 'text-green-400' : 'text-gray-300'}>
                {discountOnly ? 'Discount Only' : 'All Locations'}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Daily Plan */}
      <div className="space-y-4">
        {Object.keys(recommendations).map(mealType => {
          if (recommendations[mealType].length === 0) return null;
          
          const MealIcon = mealIcons[mealType] || Utensils;
          
          return (
            <div key={mealType} className="bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center mb-3">
                <div className="bg-gray-600 p-2 rounded-md mr-2">
                  <MealIcon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="text-white font-medium">
                  {mealType.charAt(0).toUpperCase() + mealType.slice(1).replace('_', ' ')}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendations[mealType].map((place, index) => (
                  <div key={`${place.name}-${index}`} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-white font-medium">{place.name}</h4>
                        <div className="flex items-center text-gray-400 text-sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{place.area}</span>
                        </div>
                      </div>
                      
                      {place.meal_plan_discount && (
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-md">
                          65% Discount
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {place.dietary_options?.map(diet => (
                        <span key={diet} className="bg-gray-600 text-gray-300 text-xs px-2 py-0.5 rounded">
                          {diet}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center text-gray-400 text-sm">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>Wait: ~{place.avg_wait_time} mins</span>
                    </div>
                    
                    <div className="mt-2 text-sm text-indigo-300 border-t border-gray-700 pt-2">
                      {place.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        Recommendations are based on your transaction history, preferences, and real-time dining data.
      </div>
    </div>
  );
}