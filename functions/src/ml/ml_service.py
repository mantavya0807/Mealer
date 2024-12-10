# ml_service.py
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from datetime import datetime, timedelta

class SpendingPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.location_encoder = LabelEncoder()
        self.day_encoder = LabelEncoder()
        
    def prepare_features(self, transactions):
        """Convert transactions into features for ML model"""
        df = pd.DataFrame(transactions)
        
        # Convert timestamp to datetime if it's not already
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Extract temporal features
        df['day_of_week'] = df['timestamp'].dt.day_name()
        df['hour'] = df['timestamp'].dt.hour
        df['week_of_semester'] = ((df['timestamp'] - df['timestamp'].min()).dt.days // 7) + 1
        
        # Encode categorical variables
        df['location_encoded'] = self.location_encoder.fit_transform(df['location'])
        df['day_encoded'] = self.day_encoder.fit_transform(df['day_of_week'])
        
        # Calculate cumulative spending and daily rates
        df = df.sort_values('timestamp')
        df['cumulative_spending'] = df['amount'].abs().cumsum()
        df['daily_spending_rate'] = df['cumulative_spending'] / (df['week_of_semester'] * 7)
        
        return df

    def train_spending_predictor(self, transactions):
        """Train the model to predict future spending"""
        df = self.prepare_features(transactions)
        
        # Prepare features for spending prediction
        features = df[[
            'location_encoded', 'day_encoded', 'hour',
            'week_of_semester', 'daily_spending_rate'
        ]].values
        
        # Target: Next week's total spending
        next_week_spending = []
        for i in range(len(df)):
            week = df.iloc[i]['week_of_semester']
            next_week_data = df[df['week_of_semester'] == week + 1]
            next_week_spending.append(next_week_data['amount'].abs().sum() if len(next_week_data) > 0 else 0)
        
        # Split data and train model
        X_train, X_test, y_train, y_test = train_test_split(
            features, next_week_spending, test_size=0.2, random_state=42
        )
        
        self.model.fit(X_train, y_train)
        return self.model.score(X_test, y_test)

    def predict_funds_exhaustion(self, transactions, current_balance, meal_plan_type):
        """Predict when funds might run out"""
        df = self.prepare_features(transactions)
        
        # Calculate average daily spending
        daily_spending = df.groupby('day_of_week')['amount'].abs().mean()
        avg_daily_spending = daily_spending.mean()
        
        # Project future spending
        days_until_empty = current_balance / avg_daily_spending
        predicted_empty_date = datetime.now() + timedelta(days=days_until_empty)
        
        # Calculate risk level
        semester_days_remaining = 120  # Approximate days in a semester
        risk_level = 'LOW'
        if days_until_empty < semester_days_remaining:
            risk_ratio = days_until_empty / semester_days_remaining
            if risk_ratio < 0.25:
                risk_level = 'HIGH'
            elif risk_ratio < 0.5:
                risk_level = 'MEDIUM'
        
        return {
            'predicted_empty_date': predicted_empty_date,
            'days_remaining': days_until_empty,
            'risk_level': risk_level,
            'daily_spending_pattern': daily_spending.to_dict(),
            'recommended_daily_budget': current_balance / semester_days_remaining
        }

    def recommend_meal_plan(self, transactions, current_meal_plan):
        """Recommend optimal meal plan based on usage patterns"""
        df = self.prepare_features(transactions)
        
        # Analyze spending patterns
        total_spent = df['amount'].abs().sum()
        avg_transaction = df['amount'].abs().mean()
        discount_usage = len(df[df['location'].str.contains('market|hub', case=False)]) / len(df)
        
        # Define meal plan options and their characteristics
        meal_plans = {
            'level_1': {'cost': 2000, 'value': 2200, 'best_for': 'light spenders'},
            'level_2': {'cost': 2800, 'value': 3200, 'best_for': 'moderate spenders'},
            'level_3': {'cost': 3500, 'value': 4200, 'best_for': 'heavy spenders'}
        }
        
        # Calculate projected semester spending
        weekly_spending = total_spent / df['week_of_semester'].max()
        projected_semester_spending = weekly_spending * 15  # 15 weeks in a semester
        
        # Determine optimal plan
        optimal_plan = None
        min_difference = float('inf')
        
        for plan, details in meal_plans.items():
            difference = abs(details['value'] - projected_semester_spending)
            if difference < min_difference:
                min_difference = difference
                optimal_plan = plan
        
        return {
            'recommended_plan': optimal_plan,
            'current_spending_pattern': {
                'weekly_average': weekly_spending,
                'projected_semester': projected_semester_spending,
                'avg_transaction': avg_transaction,
                'discount_usage_ratio': discount_usage
            },
            'reason': f"Based on your spending patterns, you're projected to spend ${projected_semester_spending:.2f} per semester",
            'potential_savings': meal_plans[optimal_plan]['value'] - meal_plans[optimal_plan]['cost']
        }

    def suggest_best_times(self, transactions):
        """Suggest optimal visiting times for locations"""
        df = self.prepare_features(transactions)
        
        location_times = {}
        for location in df['location'].unique():
            location_data = df[df['location'] == location]
            
            # Analyze peak times
            hourly_traffic = location_data.groupby('hour').size()
            peak_hours = hourly_traffic.nlargest(3).index.tolist()
            quiet_hours = hourly_traffic.nsmallest(3).index.tolist()
            
            # Analyze wait times (estimated by transaction density)
            hourly_density = location_data.groupby('hour').size() / len(location_data)
            
            location_times[location] = {
                'peak_hours': peak_hours,
                'quiet_hours': quiet_hours,
                'best_days': location_data.groupby('day_of_week').size().nsmallest(3).index.tolist(),
                'hourly_busyness': hourly_density.to_dict()
            }
        
        return location_times