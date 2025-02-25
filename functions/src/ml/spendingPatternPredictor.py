import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from datetime import datetime, timedelta
import scipy.stats as stats
from typing import Dict, List, Tuple, Any, Optional

class SpendingPatternPredictor:
    """
    Machine learning model to predict user spending patterns and provide
    personalized recommendations for meal plan optimization
    """
    
    def __init__(self):
        # Models for different prediction tasks
        self.daily_spending_model = None
        self.funds_depletion_model = None
        self.location_preference_model = None
        
        # Preprocessing pipelines
        self.daily_preprocessor = None
        self.depletion_preprocessor = None
        self.location_preprocessor = None
        
        # Cached feature importance
        self.feature_importance = {}
        
    def preprocess_transactions(self, transactions: List[Dict]) -> pd.DataFrame:
        """Convert raw transaction data to a dataframe with engineered features"""
        if not transactions:
            return pd.DataFrame()
            
        # Convert to DataFrame
        df = pd.DataFrame(transactions)
        
        # Ensure timestamp is a datetime
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Basic feature engineering
        if 'timestamp' in df.columns:
            df['day_of_week'] = df['timestamp'].dt.dayofweek
            df['hour'] = df['timestamp'].dt.hour
            df['month'] = df['timestamp'].dt.month
            df['day'] = df['timestamp'].dt.day
            df['weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
            
            # Create time periods
            conditions = [
                (df['hour'] >= 6) & (df['hour'] < 10),
                (df['hour'] >= 10) & (df['hour'] < 14),
                (df['hour'] >= 14) & (df['hour'] < 17),
                (df['hour'] >= 17) & (df['hour'] < 21),
                (df['hour'] >= 21) | (df['hour'] < 6)
            ]
            values = ['breakfast', 'lunch', 'afternoon', 'dinner', 'latenight']
            df['meal_period'] = np.select(conditions, values, default='other')
            
            # Time since semester start (assuming September 1 or January 15 start dates)
            current_year = datetime.now().year
            spring_start = pd.Timestamp(f"{current_year}-01-15")
            fall_start = pd.Timestamp(f"{current_year}-09-01")
            
            # Determine which semester start date to use
            current_month = datetime.now().month
            semester_start = spring_start if current_month < 6 else fall_start
            
            df['days_since_semester_start'] = (df['timestamp'] - semester_start).dt.days
            
            # Days between transactions
            df = df.sort_values('timestamp')
            df['days_since_last_transaction'] = (
                df['timestamp'].diff().dt.total_seconds() / (24 * 3600)
            ).fillna(0)
        
        # Calculate amount features
        if 'amount' in df.columns:
            # Ensure amount is always positive for analysis
            df['amount'] = df['amount'].abs()
            
            # Rolling means for spending trends
            df['rolling_3day_mean'] = df['amount'].rolling(3).mean().fillna(df['amount'])
            df['rolling_7day_mean'] = df['amount'].rolling(7).mean().fillna(df['amount'])
            
            # Cumulative spending
            df['cumulative_spending'] = df['amount'].cumsum()
        
        # Create location and meal plan features
        if 'location' in df.columns:
            # Get dining commons locations
            dining_commons = ['findlay', 'waring', 'redifer', 'pollock', 'north']
            df['is_dining_commons'] = df['location'].str.lower().apply(
                lambda x: any(commons in x.lower() for commons in dining_commons)
            ).astype(int)
            
            # Check if location is HUB
            df['is_hub'] = df['location'].str.lower().str.contains('hub').astype(int)
            
            # Check if location is a market
            df['is_market'] = df['location'].str.lower().str.contains('market').astype(int)
        
        # Account type features
        if 'accountType' in df.columns:
            df['is_meal_plan'] = (df['accountType'] == 'CampusMealPlan').astype(int)
            df['is_lioncash'] = (df['accountType'] == 'LionCash').astype(int)
        
        return df
    
    def fit_daily_spending_model(self, transactions: List[Dict]) -> None:
        """Fit model to predict daily spending amounts"""
        # Preprocess data
        df = self.preprocess_transactions(transactions)
        if df.empty:
            raise ValueError("No transaction data provided for training")
            
        # Features for daily spending prediction
        features = ['day_of_week', 'month', 'hour', 'weekend', 'days_since_semester_start']
        categorical_features = ['meal_period']
        target = 'amount'
        
        # Ensure required columns exist
        for col in features + categorical_features + [target]:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in transaction data")
        
        # Create preprocessing pipeline
        self.daily_preprocessor = ColumnTransformer([
            ('num', StandardScaler(), features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
        
        # Split data
        X = df[features + categorical_features]
        y = df[target]
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Create and fit model pipeline
        self.daily_spending_model = Pipeline([
            ('preprocessor', self.daily_preprocessor),
            ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
        ])
        
        self.daily_spending_model.fit(X_train, y_train)
        
        # Store feature importance
        if hasattr(self.daily_spending_model['regressor'], 'feature_importances_'):
            self.feature_importance['daily_spending'] = self.daily_spending_model['regressor'].feature_importances_
    
    def fit_funds_depletion_model(self, transactions: List[Dict], starting_balance: float) -> None:
        """Fit model to predict when funds will be depleted"""
        # Preprocess data
        df = self.preprocess_transactions(transactions)
        if df.empty:
            raise ValueError("No transaction data provided for training")
            
        # Features for funds depletion prediction
        features = [
            'days_since_semester_start', 'rolling_7day_mean', 
            'is_dining_commons', 'is_hub', 'is_market'
        ]
        
        # Generate depletion timeline based on spending rate
        if 'amount' in df.columns and 'timestamp' in df.columns:
            # Calculate daily spending
            df_daily = df.groupby(df['timestamp'].dt.date)['amount'].sum().reset_index()
            df_daily = df_daily.rename(columns={'timestamp': 'date'})
            
            # Fill missing dates with 0
            date_range = pd.date_range(start=df_daily['date'].min(), end=df_daily['date'].max())
            df_daily = df_daily.set_index('date').reindex(date_range, fill_value=0).reset_index()
            df_daily = df_daily.rename(columns={'index': 'date'})
            
            # Calculate remaining balance
            df_daily['remaining_balance'] = starting_balance - df_daily['amount'].cumsum()
            
            # Create target: days until depletion based on current spending rate
            df_daily['days_to_depletion'] = np.nan
            
            for i in range(len(df_daily)):
                current_date = df_daily.loc[i, 'date']
                current_balance = df_daily.loc[i, 'remaining_balance']
                
                if current_balance <= 0:
                    df_daily.loc[i, 'days_to_depletion'] = 0
                    continue
                
                # Calculate average daily spending over the past 14 days
                past_spending = df_daily[
                    (df_daily['date'] <= current_date) & 
                    (df_daily['date'] >= current_date - pd.Timedelta(days=14))
                ]['amount'].mean()
                
                # If no past spending, use the overall average
                if pd.isna(past_spending) or past_spending == 0:
                    past_spending = df_daily['amount'].mean()
                    if past_spending == 0:
                        past_spending = 10  # Default value if no spending data
                
                # Calculate days to depletion
                days_to_depletion = current_balance / past_spending
                df_daily.loc[i, 'days_to_depletion'] = min(days_to_depletion, 150)  # Cap at reasonable value
            
            # Features for daily prediction
            daily_features = ['date', 'amount', 'remaining_balance', 'days_to_depletion']
            df_features = df_daily[daily_features].dropna()
            
            if len(df_features) > 10:  # Ensure we have enough data
                # Add day of week and other time features
                df_features['day_of_week'] = pd.to_datetime(df_features['date']).dt.dayofweek
                df_features['month'] = pd.to_datetime(df_features['date']).dt.month
                df_features['day'] = pd.to_datetime(df_features['date']).dt.day
                
                # Create training data
                X = df_features[['day_of_week', 'month', 'day', 'remaining_balance', 'amount']]
                y = df_features['days_to_depletion']
                
                # Split data
                X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                
                # Create and fit model
                self.depletion_preprocessor = StandardScaler()
                
                self.funds_depletion_model = Pipeline([
                    ('preprocessor', self.depletion_preprocessor),
                    ('regressor', GradientBoostingRegressor(n_estimators=100, random_state=42))
                ])
                
                self.funds_depletion_model.fit(X_train, y_train)
                
                # Store feature importance
                if hasattr(self.funds_depletion_model['regressor'], 'feature_importances_'):
                    self.feature_importance['funds_depletion'] = self.funds_depletion_model['regressor'].feature_importances_
    
    def fit_location_preference_model(self, transactions: List[Dict]) -> None:
        """Fit model to predict preferred dining locations based on time and day"""
        # Preprocess data
        df = self.preprocess_transactions(transactions)
        if df.empty:
            raise ValueError("No transaction data provided for training")
            
        # Ensure we have the required columns
        required_cols = ['location', 'day_of_week', 'hour', 'meal_period']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Required column '{col}' not found in transaction data")
        
        # Get unique locations
        locations = df['location'].unique()
        
        # For each location, create a binary target indicating if user visited that location
        for location in locations:
            df[f'visited_{location}'] = (df['location'] == location).astype(int)
        
        # Features for location prediction
        features = ['day_of_week', 'hour', 'weekend']
        categorical_features = ['meal_period']
        
        # Create preprocessing pipeline
        self.location_preprocessor = ColumnTransformer([
            ('num', StandardScaler(), features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ])
        
        # Train a model for each location
        self.location_preference_model = {}
        
        for location in locations:
            target = f'visited_{location}'
            
            # Split data
            X = df[features + categorical_features]
            y = df[target]
            
            if len(df[df[target] == 1]) < 5:
                # Not enough data for this location
                continue
                
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Create and fit model
            model = Pipeline([
                ('preprocessor', self.location_preprocessor),
                ('classifier', RandomForestRegressor(n_estimators=50, random_state=42))
            ])
            
            model.fit(X_train, y_train)
            self.location_preference_model[location] = model
    
    def predict_daily_spending(self, current_date: datetime, day_of_week: Optional[int] = None) -> Dict[str, Any]:
        """Predict spending for a specific day"""
        if self.daily_spending_model is None:
            raise ValueError("Daily spending model has not been trained yet")
        
        # Use provided day of week or get from current date
        if day_of_week is None:
            day_of_week = current_date.weekday()
        
        # Determine semester start date
        current_year = current_date.year
        spring_start = datetime(current_year, 1, 15)
        fall_start = datetime(current_year, 9, 1)
        semester_start = spring_start if current_date.month < 6 else fall_start
        
        # Calculate days since semester start
        days_since_semester_start = (current_date - semester_start).days
        
        # Prepare prediction data for different meal periods
        meal_periods = ['breakfast', 'lunch', 'afternoon', 'dinner', 'latenight']
        hours = [8, 12, 15, 18, 22]  # Representative hours for each meal period
        
        predictions = {}
        total_predicted = 0
        
        for meal_period, hour in zip(meal_periods, hours):
            # Create feature vector
            features = pd.DataFrame({
                'day_of_week': [day_of_week],
                'month': [current_date.month],
                'hour': [hour],
                'weekend': [1 if day_of_week >= 5 else 0],
                'days_since_semester_start': [days_since_semester_start],
                'meal_period': [meal_period]
            })
            
            # Make prediction
            predicted_amount = max(0, self.daily_spending_model.predict(features)[0])
            predictions[meal_period] = predicted_amount
            total_predicted += predicted_amount
        
        return {
            'date': current_date.strftime('%Y-%m-%d'),
            'day_of_week': day_of_week,
            'day_name': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][day_of_week],
            'predicted_spending': predictions,
            'total_predicted': total_predicted
        }
    
    def predict_weekly_spending(self, current_date: datetime) -> List[Dict[str, Any]]:
        """Predict spending for each day of the coming week"""
        weekly_predictions = []
        
        for i in range(7):
            day_date = current_date + timedelta(days=i)
            day_prediction = self.predict_daily_spending(day_date)
            weekly_predictions.append(day_prediction)
        
        return weekly_predictions
    
    def predict_funds_depletion(self, current_balance: float, current_date: datetime) -> Dict[str, Any]:
        """Predict when funds will be depleted based on current balance and spending patterns"""
        if self.funds_depletion_model is None:
            # Fallback to a simple prediction if no model
            return self._simple_depletion_prediction(current_balance, current_date)
        
        try:
            # Predict using ML model
            # Create features for prediction
            features = pd.DataFrame({
                'day_of_week': [current_date.weekday()],
                'month': [current_date.month],
                'day': [current_date.day],
                'remaining_balance': [current_balance],
                'amount': [0]  # Placeholder, will be ignored by model
            })
            
            # Predict days to depletion
            days_to_depletion = max(0, self.funds_depletion_model.predict(features)[0])
            
            # Calculate depletion date
            depletion_date = current_date + timedelta(days=days_to_depletion)
            
            # Calculate risk level
            semester_end_date = self._get_semester_end_date(current_date)
            days_to_semester_end = (semester_end_date - current_date).days
            
            if days_to_depletion < days_to_semester_end:
                risk_level = 'HIGH'
            elif days_to_depletion < days_to_semester_end * 1.1:
                risk_level = 'MEDIUM'
            else:
                risk_level = 'LOW'
            
            # Calculate daily budget
            daily_budget = current_balance / days_to_semester_end if days_to_semester_end > 0 else 0
            
            # Get ML-calculated daily spending prediction
            weekly_predictions = self.predict_weekly_spending(current_date)
            avg_daily_spending = sum(p['total_predicted'] for p in weekly_predictions) / 7
            
            return {
                'current_balance': current_balance,
                'days_to_depletion': days_to_depletion,
                'depletion_date': depletion_date.strftime('%Y-%m-%d'),
                'risk_level': risk_level,
                'daily_budget': daily_budget,
                'avg_daily_spending': avg_daily_spending,
                'semester_end_date': semester_end_date.strftime('%Y-%m-%d'),
                'days_to_semester_end': days_to_semester_end
            }
        except Exception as e:
            print(f"Error in ML prediction: {e}")
            # Fallback to simple prediction
            return self._simple_depletion_prediction(current_balance, current_date)
    
    def _simple_depletion_prediction(self, current_balance: float, current_date: datetime) -> Dict[str, Any]:
        """Simple prediction based on heuristics when ML model is not available"""
        # Estimate a reasonable daily spending amount
        estimated_daily_spending = 20.00  # Default assumption
        
        # Calculate days to depletion
        days_to_depletion = current_balance / estimated_daily_spending if estimated_daily_spending > 0 else 120
        
        # Calculate depletion date
        depletion_date = current_date + timedelta(days=days_to_depletion)
        
        # Calculate risk level
        semester_end_date = self._get_semester_end_date(current_date)
        days_to_semester_end = (semester_end_date - current_date).days
        
        if days_to_depletion < days_to_semester_end:
            risk_level = 'HIGH'
        elif days_to_depletion < days_to_semester_end * 1.1:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        # Calculate daily budget
        daily_budget = current_balance / days_to_semester_end if days_to_semester_end > 0 else 0
        
        return {
            'current_balance': current_balance,
            'days_to_depletion': days_to_depletion,
            'depletion_date': depletion_date.strftime('%Y-%m-%d'),
            'risk_level': risk_level,
            'daily_budget': daily_budget,
            'avg_daily_spending': estimated_daily_spending,
            'semester_end_date': semester_end_date.strftime('%Y-%m-%d'),
            'days_to_semester_end': days_to_semester_end,
            'is_estimate': True  # Flag that this is an estimate, not ML prediction
        }
    
    def _get_semester_end_date(self, current_date: datetime) -> datetime:
        """Determine the end date of the current semester"""
        current_year = current_date.year
        current_month = current_date.month
        
        # Spring semester: January - May
        if 1 <= current_month <= 5:
            return datetime(current_year, 5, 15)
        # Fall semester: August - December
        elif 8 <= current_month <= 12:
            return datetime(current_year, 12, 20)
        # Summer: June - July
        else:
            return datetime(current_year, 7, 31)
    
    def predict_location_preferences(self, time_of_day: str, day_of_week: int, date: datetime) -> List[Dict[str, Any]]:
        """Predict preferred dining locations for a specific time and day"""
        if not self.location_preference_model:
            raise ValueError("Location preference model has not been trained yet")
        
        # Convert time_of_day to hour
        hour_mapping = {
            'breakfast': 8,
            'lunch': 12,
            'afternoon': 15,
            'dinner': 18,
            'latenight': 22
        }
        
        hour = hour_mapping.get(time_of_day, 12)  # Default to noon if not specified
        
        # Create features for prediction
        features = pd.DataFrame({
            'day_of_week': [day_of_week],
            'hour': [hour],
            'weekend': [1 if day_of_week >= 5 else 0],
            'meal_period': [time_of_day]
        })
        
        # Get predictions for each location
        predictions = []
        
        for location, model in self.location_preference_model.items():
            try:
                # Predict likelihood of visiting this location
                likelihood = model.predict(features)[0]
                
                predictions.append({
                    'location': location,
                    'likelihood': float(likelihood),
                    'time_of_day': time_of_day,
                    'day_of_week': day_of_week
                })
            except Exception as e:
                print(f"Error predicting for location {location}: {e}")
        
        # Sort by likelihood, highest first
        predictions.sort(key=lambda x: x['likelihood'], reverse=True)
        
        return predictions
    
    def analyze_spending_patterns(self, transactions: List[Dict]) -> Dict[str, Any]:
        """Analyze spending patterns to provide insights and recommendations"""
        # Preprocess data
        df = self.preprocess_transactions(transactions)
        if df.empty:
            return {
                'error': 'No transaction data provided for analysis',
                'recommendation': 'Please provide transaction data to get personalized insights.'
            }
        
        results = {}
        
        # Calculate summary statistics
        if 'amount' in df.columns:
            results['summary'] = {
                'total_spending': float(df['amount'].sum()),
                'average_transaction': float(df['amount'].mean()),
                'max_transaction': float(df['amount'].max()),
                'transaction_count': len(df)
            }
        
        # Analyze patterns by day of week
        if 'day_of_week' in df.columns and 'amount' in df.columns:
            day_spending = df.groupby('day_of_week')['amount'].agg(['sum', 'mean', 'count'])
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            results['day_of_week'] = [
                {
                    'day': days[i],
                    'total_spending': float(day_spending.loc[i, 'sum']) if i in day_spending.index else 0,
                    'average_transaction': float(day_spending.loc[i, 'mean']) if i in day_spending.index else 0,
                    'transaction_count': int(day_spending.loc[i, 'count']) if i in day_spending.index else 0
                }
                for i in range(7)
            ]
            
            # Find highest and lowest spending days
            if not day_spending.empty:
                max_day = day_spending['sum'].idxmax()
                min_day = day_spending['sum'].idxmax()
                
                results['highest_spending_day'] = days[max_day]
                results['lowest_spending_day'] = days[min_day]
        
        # Analyze patterns by meal period
        if 'meal_period' in df.columns and 'amount' in df.columns:
            meal_spending = df.groupby('meal_period')['amount'].agg(['sum', 'mean', 'count'])
            
            results['meal_period'] = [
                {
                    'period': period,
                    'total_spending': float(meal_spending.loc[period, 'sum']) if period in meal_spending.index else 0,
                    'average_transaction': float(meal_spending.loc[period, 'mean']) if period in meal_spending.index else 0,
                    'transaction_count': int(meal_spending.loc[period, 'count']) if period in meal_spending.index else 0
                }
                for period in ['breakfast', 'lunch', 'afternoon', 'dinner', 'latenight']
                if period in meal_spending.index
            ]
        
        # Analyze location preferences
        if 'location' in df.columns and 'amount' in df.columns:
            location_spending = df.groupby('location')['amount'].agg(['sum', 'mean', 'count'])
            
            results['locations'] = [
                {
                    'location': location,
                    'total_spending': float(location_spending.loc[location, 'sum']),
                    'average_transaction': float(location_spending.loc[location, 'mean']),
                    'transaction_count': int(location_spending.loc[location, 'count'])
                }
                for location in location_spending.index
            ]
            
            # Sort by total spending
            results['locations'].sort(key=lambda x: x['total_spending'], reverse=True)
            
            # Top locations
            results['top_locations'] = results['locations'][:3] if len(results['locations']) >= 3 else results['locations']
        
        # Analyze meal plan efficiency
        if 'is_dining_commons' in df.columns and 'amount' in df.columns:
            commons_spending = df[df['is_dining_commons'] == 1]['amount'].sum()
            non_commons_spending = df[df['is_dining_commons'] == 0]['amount'].sum()
            total_spending = commons_spending + non_commons_spending
            
            if total_spending > 0:
                commons_percentage = (commons_spending / total_spending) * 100
                
                # Estimate potential savings if all non-commons spending was at commons
                potential_savings = non_commons_spending * 0.65  # 65% discount at dining commons
                
                results['meal_plan_efficiency'] = {
                    'commons_spending': float(commons_spending),
                    'non_commons_spending': float(non_commons_spending),
                    'commons_percentage': float(commons_percentage),
                    'potential_savings': float(potential_savings)
                }
                
                # Efficiency rating
                if commons_percentage >= 80:
                    results['meal_plan_efficiency']['rating'] = 'Excellent'
                elif commons_percentage >= 60:
                    results['meal_plan_efficiency']['rating'] = 'Good'
                elif commons_percentage >= 40:
                    results['meal_plan_efficiency']['rating'] = 'Average'
                else:
                    results['meal_plan_efficiency']['rating'] = 'Poor'
        
        # Generate personalized recommendations
        results['recommendations'] = self._generate_recommendations(df)
        
        return results
    
    def _generate_recommendations(self, df: pd.DataFrame) -> List[Dict[str, str]]:
        """Generate personalized recommendations based on spending patterns"""
        recommendations = []
        
        # Check for spending in inefficient locations (non-dining commons)
        if 'is_dining_commons' in df.columns and 'amount' in df.columns:
            commons_spending = df[df['is_dining_commons'] == 1]['amount'].sum()
            non_commons_spending = df[df['is_dining_commons'] == 0]['amount'].sum()
            total_spending = commons_spending + non_commons_spending
            
            if total_spending > 0:
                commons_percentage = (commons_spending / total_spending) * 100
                
                if commons_percentage < 50:
                    # High non-commons spending
                    market_spending = df[df['is_market'] == 1]['amount'].sum()
                    hub_spending = df[df['is_hub'] == 1]['amount'].sum()
                    
                    if market_spending > 0.3 * non_commons_spending:
                        recommendations.append({
                            'type': 'inefficient_spending',
                            'title': 'High Market Spending',
                            'description': 'You\'re spending a significant amount at markets where meal plan discounts don\'t apply. Consider using dining commons more frequently to take advantage of the 65% discount.'
                        })
                    
                    if hub_spending > 0.3 * non_commons_spending:
                        recommendations.append({
                            'type': 'inefficient_spending',
                            'title': 'High HUB Spending',
                            'description': 'You\'re spending a lot at HUB restaurants where meal plan discounts don\'t apply. Using dining commons more often could help your meal plan last longer.'
                        })
                    
                    if commons_percentage < 30:
                        recommendations.append({
                            'type': 'inefficient_spending',
                            'title': 'Very Low Discount Utilization',
                            'description': 'Only ' + str(int(commons_percentage)) + '% of your spending is at locations with the 65% discount. You could significantly extend your meal plan by dining more often at commons locations.'
                        })
        
        # Check for spending patterns by time of day
        if 'meal_period' in df.columns and 'amount' in df.columns:
            meal_spending = df.groupby('meal_period')['amount'].sum()
            total_spending = meal_spending.sum()
            
            if total_spending > 0 and 'latenight' in meal_spending:
                latenight_percentage = (meal_spending['latenight'] / total_spending) * 100
                
                if latenight_percentage > 30:
                    recommendations.append({
                        'type': 'time_pattern',
                        'title': 'High Late Night Spending',
                        'description': 'You spend a significant portion of your meal plan during late night hours. Late night options often have fewer choices and may be less cost-effective.'
                    })
        
        # Check for high spending days
        if 'day_of_week' in df.columns and 'amount' in df.columns:
            day_spending = df.groupby('day_of_week')['amount'].sum()
            total_spending = day_spending.sum()
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            if total_spending > 0:
                max_day = day_spending.idxmax()
                max_day_percentage = (day_spending[max_day] / total_spending) * 100
                
                if max_day_percentage > 25:
                    recommendations.append({
                        'type': 'day_pattern',
                        'title': f'High {days[max_day]} Spending',
                        'description': f'You spend {int(max_day_percentage)}% of your weekly meal plan on {days[max_day]}s. Try to distribute your spending more evenly throughout the week.'
                    })
        
        # General recommendations
        recommendations.append({
            'type': 'general',
            'title': 'Maximize Dining Commons Usage',
            'description': 'Always prioritize dining commons (Findlay, Waring, Redifer, North, Pollock) to receive the 65% meal plan discount.'
        })
        
        recommendations.append({
            'type': 'general',
            'title': 'Use LionCash for Non-Discounted Locations',
            'description': 'For HUB dining and markets, consider using LionCash to get the 10% discount instead of your meal plan which receives no discount at these locations.'
        })
        
        return recommendations