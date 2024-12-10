import React, { useState, useEffect } from 'react';
import { MLService } from '../services/mlService';
import { 
    Calendar,
    AlertTriangle,
    Clock,
    TrendingUp,
    DollarSign
} from 'lucide-react';

export const SpendingPredictions = ({ transactions, currentBalance, mealPlanType }) => {
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPredictions = async () => {
            try {
                setLoading(true);
                const results = await MLService.getPredictions(
                    transactions,
                    currentBalance,
                    mealPlanType
                );
                setPredictions(results);
            } catch (err) {
                setError('Failed to load predictions');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (transactions.length > 0) {
            fetchPredictions();
        }
    }, [transactions, currentBalance, mealPlanType]);

    if (loading) {
        return <div className="animate-pulse">Loading predictions...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    if (!predictions) {
        return null;
    }

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'HIGH':
                return 'text-red-500';
            case 'MEDIUM':
                return 'text-yellow-500';
            default:
                return 'text-green-500';
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold text-white mb-4">
                    Spending Predictions
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Funds Exhaustion Prediction */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                            <Calendar className="h-5 w-5 text-blue-400 mr-2" />
                            <h3 className="text-white font-medium">Funds Exhaustion Date</h3>
                        </div>
                        <p className="text-lg text-white">
                            {new Date(predictions.predicted_empty_date).toLocaleDateString()}
                        </p>
                        <p className={`text-sm ${getRiskColor(predictions.risk_level)}`}>
                            {predictions.days_remaining.toFixed(0)} days remaining
                        </p>
                    </div>

                    {/* Daily Budget */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                            <DollarSign className="h-5 w-5 text-green-400 mr-2" />
                            <h3 className="text-white font-medium">Recommended Daily Budget</h3>
                        </div>
                        <p className="text-lg text-white">
                            ${predictions.recommended_daily_budget.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-400">
                            To last the semester
                        </p>
                    </div>

                    {/* Risk Level */}
                    <div className="bg-gray-700 p-4 rounded-lg">
                        <div className="flex items-center mb-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                            <h3 className="text-white font-medium">Risk Level</h3>
                        </div>
                        <p className={`text-lg font-bold ${getRiskColor(predictions.risk_level)}`}>
                            {predictions.risk_level}
                        </p>
                        <p className="text-sm text-gray-400">
                            Based on current spending
                        </p>
                    </div>
                </div>

                {/* Daily Spending Pattern */}
                <div className="mt-6">
                    <h3 className="text-white font-medium mb-3">Daily Spending Pattern</h3>
                    <div className="grid grid-cols-7 gap-2">
                        {Object.entries(predictions.daily_spending_pattern).map(([day, amount]) => (
                            <div key={day} className="bg-gray-700 p-3 rounded-lg text-center">
                                <p className="text-sm text-gray-400">{day.slice(0, 3)}</p>
                                <p className="text-white font-medium">${amount.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};