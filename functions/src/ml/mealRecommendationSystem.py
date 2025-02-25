import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from typing import List, Dict, Any, Tuple
from datetime import datetime, time

class MealRecommendationSystem:
    """
    Machine learning-based recommendation system for Penn State dining locations
    that learns from user transaction history and preferences.
    """
    
    def __init__(self):
        # Initialize dining locations data with features
        self.dining_locations = self._init_dining_data()
        
        # Model pipeline for content-based filtering
        self.model = None
        
        # User preferences and history
        self.user_profiles = {}
        
    def _init_dining_data(self) -> pd.DataFrame:
        """Initialize dining locations dataset with relevant features"""
        # This would ideally be loaded from a database
        locations_data = [
            # East Area
            {"id": "e1", "name": "Findlay Commons", "area": "East", "category": "Dining Hall", 
             "meal_plan_discount": True, "price_level": 2, "avg_wait_time": 10, 
             "cuisine_types": ["American", "Italian", "Asian"], 
             "dietary_options": ["Vegetarian", "Vegan", "Gluten-Free"],
             "breakfast": True, "lunch": True, "dinner": True, "late_night": False,
             "opening_time": "07:00", "closing_time": "22:00",
             "busy_hours": [11, 12, 13, 17, 18, 19]},
             
            {"id": "e2", "name": "Flipps", "area": "East", "category": "Fast Food", 
             "meal_plan_discount": True, "price_level": 2, "avg_wait_time": 15, 
             "cuisine_types": ["American", "Burgers"], 
             "dietary_options": ["Vegetarian"],
             "breakfast": False, "lunch": True, "dinner": True, "late_night": True,
             "opening_time": "11:00", "closing_time": "23:00",
             "busy_hours": [12, 13, 18, 19, 20]},
            
            # West Area
            {"id": "w1", "name": "Waring Commons", "area": "West", "category": "Dining Hall", 
             "meal_plan_discount": True, "price_level": 2, "avg_wait_time": 12, 
             "cuisine_types": ["American", "International"], 
             "dietary_options": ["Vegetarian", "Vegan", "Gluten-Free"],
             "breakfast": True, "lunch": True, "dinner": True, "late_night": False,
             "opening_time": "07:00", "closing_time": "22:00",
             "busy_hours": [11, 12, 13, 17, 18, 19]},
             
            {"id": "w2", "name": "The Edge Coffee Bar", "area": "West", "category": "Coffee Shop", 
             "meal_plan_discount": False, "price_level": 1, "avg_wait_time": 8, 
             "cuisine_types": ["Coffee", "Bakery"], 
             "dietary_options": ["Vegetarian", "Vegan"],
             "breakfast": True, "lunch": False, "dinner": False, "late_night": False,
             "opening_time": "07:00", "closing_time": "16:00",
             "busy_hours": [8, 9, 10, 15]},
             
            # North Area
            {"id": "n1", "name": "North Food District", "area": "North", "category": "Dining Hall", 
             "meal_plan_discount": True, "price_level": 2, "avg_wait_time": 10, 
             "cuisine_types": ["American", "International", "Italian"], 
             "dietary_options": ["Vegetarian", "Vegan", "Gluten-Free", "Halal"],
             "breakfast": True, "lunch": True, "dinner": True, "late_night": False,
             "opening_time": "07:00", "closing_time": "22:00",
             "busy_hours": [11, 12, 13, 17, 18, 19]},
            
            # South Area
            {"id": "s1", "name": "Redifer Commons", "area": "South", "category": "Dining Hall", 
             "meal_plan_discount": True, "price_level": 2, "avg_wait_time": 15, 
             "cuisine_types": ["American", "Italian", "Asian", "Mexican"], 
             "dietary_options": ["Vegetarian", "Vegan", "Gluten-Free"],
             "breakfast": True, "lunch": True, "dinner": True, "late_night": False,
             "opening_time": "07:00", "closing_time": "22:00",
             "busy_hours": [11, 12, 13, 17, 18, 19]},
            
            # Pollock Area
            {"id": "p1", "name": "Pollock Commons", "area": "Pollock", "category": "Dining Hall", 
             "meal_plan_discount": True, "price_level": 2, "avg_wait_time": 12, 
             "cuisine_types": ["American", "International"], 
             "dietary_options": ["Vegetarian", "Vegan", "Gluten-Free"],
             "breakfast": True, "lunch": True, "dinner": True, "late_night": False,
             "opening_time": "07:00", "closing_time": "22:00",
             "busy_hours": [11, 12, 13, 17, 18, 19]},
            
            # HUB Area (Central)
            {"id": "h1", "name": "HUB Dining", "area": "Central", "category": "Food Court", 
             "meal_plan_discount": False, "price_level": 2, "avg_wait_time": 15, 
             "cuisine_types": ["American", "Asian", "Mexican", "Pizza"], 
             "dietary_options": ["Vegetarian", "Vegan", "Gluten-Free"],
             "breakfast": True, "lunch": True, "dinner": True, "late_night": True,
             "opening_time": "07:00", "closing_time": "24:00",
             "busy_hours": [11, 12, 13, 17, 18, 19]},
             
            {"id": "h2", "name": "Starbucks HUB", "area": "Central", "category": "Coffee Shop", 
             "meal_plan_discount": False, "price_level": 1, "avg_wait_time": 10, 
             "cuisine_types": ["Coffee", "Bakery"], 
             "dietary_options": ["Vegetarian", "Vegan"],
             "breakfast": True, "lunch": False, "dinner": False, "late_night": False,
             "opening_time": "07:00", "closing_time": "20:00",
             "busy_hours": [8, 9, 10, 14, 15]},
             
            {"id": "h3", "name": "Chick-fil-A HUB", "area": "Central", "category": "Fast Food", 
             "meal_plan_discount": False, "price_level": 2, "avg_wait_time": 20, 
             "cuisine_types": ["American", "Chicken"], 
             "dietary_options": [],
             "breakfast": True, "lunch": True, "dinner": True, "late_night": False,
             "opening_time": "07:00", "closing_time": "21:00",
             "busy_hours": [11, 12, 13, 17, 18, 19]},
        ]
        
        return pd.DataFrame(locations_data)
    
    def _preprocess_dining_data(self) -> Tuple[np.ndarray, list]:
        """Preprocess dining location data for ML model"""
        # Features for content-based filtering
        categorical_features = ['area', 'category']
        boolean_features = ['meal_plan_discount', 'breakfast', 'lunch', 'dinner', 'late_night']
        numerical_features = ['price_level', 'avg_wait_time']
        
        # Create a column transformer for preprocessing
        preprocessor = ColumnTransformer(
            transformers=[
                ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features),
                ('num', StandardScaler(), numerical_features)
            ],
            remainder='drop'  # Drop other columns not specified
        )
        
        # Apply preprocessing
        X = preprocessor.fit_transform(self.dining_locations)
        
        # Get feature names for later use
        categorical_feature_names = preprocessor.named_transformers_['cat'].get_feature_names_out(categorical_features)
        feature_names = list(categorical_feature_names) + numerical_features
        
        return X, feature_names
    
    def fit(self) -> None:
        """Fit the model on the dining locations data"""
        # Preprocess the data
        X, _ = self._preprocess_dining_data()
        
        # Create and fit the model using k-nearest neighbors
        self.model = NearestNeighbors(n_neighbors=5, algorithm='auto', metric='euclidean')
        self.model.fit(X)
        
    def update_user_profile(self, user_id: str, transactions: List[Dict], preferences: Dict = None) -> None:
        """
        Update user profile based on transaction history and explicit preferences
        
        Args:
            user_id: Unique identifier for the user
            transactions: List of transaction records with location and timestamp
            preferences: Dictionary of user preferences (dietary, cuisine, etc.)
        """
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = {
                'transaction_history': [],
                'location_frequency': {},
                'meal_time_preference': {
                    'breakfast': 0,
                    'lunch': 0,
                    'dinner': 0,
                    'late_night': 0
                },
                'dietary_preferences': [],
                'cuisines_preferred': [],
                'avoid_locations': []
            }
        
        # Update transaction history
        if transactions:
            self.user_profiles[user_id]['transaction_history'].extend(transactions)
            
            # Update location frequency
            for transaction in transactions:
                location = transaction.get('location')
                if location:
                    self.user_profiles[user_id]['location_frequency'][location] = \
                        self.user_profiles[user_id]['location_frequency'].get(location, 0) + 1
                    
                # Update meal time preferences based on transaction timestamps
                timestamp = transaction.get('timestamp')
                if timestamp:
                    if isinstance(timestamp, str):
                        try:
                            timestamp = datetime.fromisoformat(timestamp)
                        except ValueError:
                            # Skip if timestamp cannot be parsed
                            continue
                    
                    hour = timestamp.hour
                    if 6 <= hour < 11:
                        self.user_profiles[user_id]['meal_time_preference']['breakfast'] += 1
                    elif 11 <= hour < 15:
                        self.user_profiles[user_id]['meal_time_preference']['lunch'] += 1
                    elif 17 <= hour < 21:
                        self.user_profiles[user_id]['meal_time_preference']['dinner'] += 1
                    elif 21 <= hour < 24 or 0 <= hour < 6:
                        self.user_profiles[user_id]['meal_time_preference']['late_night'] += 1
        
        # Update preferences if provided
        if preferences:
            if 'dietary_preferences' in preferences:
                self.user_profiles[user_id]['dietary_preferences'] = preferences['dietary_preferences']
            
            if 'cuisines_preferred' in preferences:
                self.user_profiles[user_id]['cuisines_preferred'] = preferences['cuisines_preferred']
            
            if 'avoid_locations' in preferences:
                self.user_profiles[user_id]['avoid_locations'] = preferences['avoid_locations']
    
    def get_recommendations(
        self, 
        user_id: str, 
        time_of_day: str = None,
        meal_type: str = None,
        dietary_filter: List[str] = None,
        max_wait_time: int = None,
        discount_only: bool = False,
        current_time: datetime = None,
        num_recommendations: int = 3
    ) -> List[Dict]:
        """
        Get dining location recommendations based on user profile and context
        
        Args:
            user_id: User identifier
            time_of_day: Specific time of day (morning, afternoon, evening, night)
            meal_type: Specific meal (breakfast, lunch, dinner, late_night)
            dietary_filter: List of dietary restrictions to filter by
            max_wait_time: Maximum wait time in minutes
            discount_only: Whether to only include locations with meal plan discounts
            current_time: Current datetime for real-time recommendations
            num_recommendations: Number of recommendations to return
            
        Returns:
            List of recommended dining locations with explanation
        """
        # Check if user exists
        if user_id not in self.user_profiles:
            # Return generic recommendations if user has no profile
            return self._get_generic_recommendations(
                time_of_day=time_of_day,
                meal_type=meal_type,
                dietary_filter=dietary_filter,
                max_wait_time=max_wait_time,
                discount_only=discount_only,
                current_time=current_time,
                num_recommendations=num_recommendations
            )
        
        # Determine current context if not provided
        if not current_time:
            current_time = datetime.now()
        
        if not time_of_day and not meal_type:
            hour = current_time.hour
            
            if 5 <= hour < 11:
                meal_type = 'breakfast'
                time_of_day = 'morning'
            elif 11 <= hour < 15:
                meal_type = 'lunch'
                time_of_day = 'afternoon'
            elif 15 <= hour < 21:
                meal_type = 'dinner'
                time_of_day = 'evening'
            else:
                meal_type = 'late_night'
                time_of_day = 'night'
        
        # Filter locations based on context and preferences
        filtered_locations = self.dining_locations.copy()
        
        # Filter by meal type if specified
        if meal_type:
            filtered_locations = filtered_locations[filtered_locations[meal_type] == True]
        
        # Filter by dietary restrictions
        if dietary_filter or len(self.user_profiles[user_id]['dietary_preferences']) > 0:
            restrictions = dietary_filter or self.user_profiles[user_id]['dietary_preferences']
            filtered_locations = filtered_locations[
                filtered_locations['dietary_options'].apply(
                    lambda options: all(restriction in options for restriction in restrictions)
                )
            ]
        
        # Filter by max wait time
        if max_wait_time:
            filtered_locations = filtered_locations[filtered_locations['avg_wait_time'] <= max_wait_time]
        
        # Filter by discount
        if discount_only:
            filtered_locations = filtered_locations[filtered_locations['meal_plan_discount'] == True]
        
        # Filter out locations to avoid
        avoid_locations = self.user_profiles[user_id]['avoid_locations']
        if avoid_locations:
            filtered_locations = filtered_locations[~filtered_locations['name'].isin(avoid_locations)]
        
        # Check if any locations remain after filtering
        if filtered_locations.empty:
            return self._get_generic_recommendations(
                time_of_day=time_of_day,
                meal_type=meal_type,
                dietary_filter=dietary_filter,
                max_wait_time=max_wait_time,
                discount_only=discount_only,
                current_time=current_time,
                num_recommendations=num_recommendations
            )
        
        # Create a score for each location based on user preferences
        scores = []
        for _, location in filtered_locations.iterrows():
            score = 0
            
            # Boost score for frequently visited locations
            frequency = self.user_profiles[user_id]['location_frequency'].get(location['name'], 0)
            score += frequency * 0.5
            
            # Boost score for locations with meal plan discount if user profile suggests price sensitivity
            if location['meal_plan_discount']:
                score += 2
            
            # Boost score for preferred cuisines
            user_cuisines = self.user_profiles[user_id]['cuisines_preferred']
            if user_cuisines:
                overlap = len(set(location['cuisine_types']).intersection(set(user_cuisines)))
                score += overlap * 1.5
            
            # Adjust score based on current busyness
            if current_time and current_time.hour in location['busy_hours']:
                score -= 1
            
            scores.append(score)
        
        # Add score to the filtered locations
        filtered_locations['score'] = scores
        
        # Sort by score and get top recommendations
        recommendations = filtered_locations.sort_values('score', ascending=False).head(num_recommendations)
        
        # Format the result with explanations
        result = []
        for _, rec in recommendations.iterrows():
            explanation = self._generate_recommendation_explanation(user_id, rec, meal_type, current_time)
            
            result.append({
                'id': rec['id'],
                'name': rec['name'],
                'area': rec['area'],
                'category': rec['category'],
                'meal_plan_discount': rec['meal_plan_discount'],
                'opening_time': rec['opening_time'],
                'closing_time': rec['closing_time'],
                'cuisine_types': rec['cuisine_types'],
                'dietary_options': rec['dietary_options'],
                'avg_wait_time': rec['avg_wait_time'],
                'busy_hours': rec['busy_hours'],
                'score': rec['score'],
                'explanation': explanation
            })
        
        return result
    
    def _get_generic_recommendations(
        self, 
        time_of_day: str = None,
        meal_type: str = None,
        dietary_filter: List[str] = None,
        max_wait_time: int = None,
        discount_only: bool = False,
        current_time: datetime = None,
        num_recommendations: int = 3
    ) -> List[Dict]:
        """Generate generic recommendations when user profile is not available"""
        # Determine current context if not provided
        if not current_time:
            current_time = datetime.now()
        
        if not time_of_day and not meal_type:
            hour = current_time.hour
            
            if 5 <= hour < 11:
                meal_type = 'breakfast'
                time_of_day = 'morning'
            elif 11 <= hour < 15:
                meal_type = 'lunch'
                time_of_day = 'afternoon'
            elif 15 <= hour < 21:
                meal_type = 'dinner'
                time_of_day = 'evening'
            else:
                meal_type = 'late_night'
                time_of_day = 'night'
        
        # Filter locations based on context
        filtered_locations = self.dining_locations.copy()
        
        # Filter by meal type if specified
        if meal_type:
            filtered_locations = filtered_locations[filtered_locations[meal_type] == True]
        
        # Filter by dietary restrictions
        if dietary_filter:
            filtered_locations = filtered_locations[
                filtered_locations['dietary_options'].apply(
                    lambda options: all(restriction in options for restriction in dietary_filter)
                )
            ]
        
        # Filter by max wait time
        if max_wait_time:
            filtered_locations = filtered_locations[filtered_locations['avg_wait_time'] <= max_wait_time]
        
        # Filter by discount
        if discount_only:
            filtered_locations = filtered_locations[filtered_locations['meal_plan_discount'] == True]
        
        # Create a simple score for each location
        scores = []
        for _, location in filtered_locations.iterrows():
            score = 0
            
            # Boost score for locations with meal plan discount
            if location['meal_plan_discount']:
                score += 2
            
            # Adjust score based on current busyness
            if current_time and current_time.hour in location['busy_hours']:
                score -= 1
            
            # Boost score for dining halls for generic recommendations
            if location['category'] == 'Dining Hall':
                score += 1
                
            scores.append(score)
        
        # Add score to the filtered locations
        filtered_locations['score'] = scores
        
        # If filtered_locations is empty, return a message
        if filtered_locations.empty:
            return [{
                'name': 'No matching locations',
                'explanation': 'No dining locations match your current filters. Try adjusting your preferences.'
            }]
        
        # Sort by score and get top recommendations
        recommendations = filtered_locations.sort_values('score', ascending=False).head(num_recommendations)
        
        # Format the result with explanations
        result = []
        for _, rec in recommendations.iterrows():
            explanation = self._generate_generic_explanation(rec, meal_type, current_time)
            
            result.append({
                'id': rec['id'],
                'name': rec['name'],
                'area': rec['area'],
                'category': rec['category'],
                'meal_plan_discount': rec['meal_plan_discount'],
                'opening_time': rec['opening_time'],
                'closing_time': rec['closing_time'],
                'cuisine_types': rec['cuisine_types'],
                'dietary_options': rec['dietary_options'],
                'avg_wait_time': rec['avg_wait_time'],
                'busy_hours': rec['busy_hours'],
                'score': rec['score'],
                'explanation': explanation
            })
        
        return result
    
    def _generate_recommendation_explanation(
        self, 
        user_id: str, 
        location: pd.Series, 
        meal_type: str, 
        current_time: datetime
    ) -> str:
        """Generate personalized explanation for recommendation"""
        explanation_parts = []
        
        # Check if user frequently visits this location
        user_frequency = self.user_profiles[user_id]['location_frequency'].get(location['name'], 0)
        if user_frequency > 3:
            explanation_parts.append(f"You often visit {location['name']}")
        
        # Check if location offers meal plan discount
        if location['meal_plan_discount']:
            explanation_parts.append("Offers 65% meal plan discount")
        
        # Check if location offers preferred cuisines
        user_cuisines = self.user_profiles[user_id]['cuisines_preferred']
        if user_cuisines:
            matching_cuisines = set(location['cuisine_types']).intersection(set(user_cuisines))
            if matching_cuisines:
                cuisines_str = ", ".join(matching_cuisines)
                explanation_parts.append(f"Serves {cuisines_str} food you enjoy")
        
        # Check wait time
        if location['avg_wait_time'] <= 10:
            explanation_parts.append("Short wait times")
        
        # Check if currently busy
        if current_time and current_time.hour in location['busy_hours']:
            explanation_parts.append("Currently busy")
        else:
            explanation_parts.append("Not currently busy")
        
        # Add meal-specific explanation if appropriate
        if meal_type == 'breakfast' and location['breakfast']:
            explanation_parts.append("Good breakfast options")
        elif meal_type == 'lunch' and location['lunch']:
            explanation_parts.append("Popular lunch spot")
        elif meal_type == 'dinner' and location['dinner']:
            explanation_parts.append("Great dinner selection")
        elif meal_type == 'late_night' and location['late_night']:
            explanation_parts.append("Open late")
            
        # Format final explanation
        if explanation_parts:
            return ". ".join(explanation_parts) + "."
        else:
            return "Recommended based on your preferences."
    
    def _generate_generic_explanation(
        self, 
        location: pd.Series, 
        meal_type: str, 
        current_time: datetime
    ) -> str:
        """Generate generic explanation for recommendation"""
        explanation_parts = []
        
        # Check if location offers meal plan discount
        if location['meal_plan_discount']:
            explanation_parts.append("Offers 65% meal plan discount")
        
        # Check cuisine variety
        if len(location['cuisine_types']) >= 3:
            explanation_parts.append("Wide variety of food options")
        
        # Check dietary options
        if len(location['dietary_options']) >= 2:
            explanation_parts.append("Good for dietary restrictions")
        
        # Check wait time
        if location['avg_wait_time'] <= 10:
            explanation_parts.append("Short wait times")
        
        # Check if currently busy
        if current_time and current_time.hour in location['busy_hours']:
            explanation_parts.append("Currently busy")
        else:
            explanation_parts.append("Not currently busy")
        
        # Add meal-specific explanation if appropriate
        if meal_type == 'breakfast' and location['breakfast']:
            explanation_parts.append("Good breakfast options")
        elif meal_type == 'lunch' and location['lunch']:
            explanation_parts.append("Popular lunch spot")
        elif meal_type == 'dinner' and location['dinner']:
            explanation_parts.append("Great dinner selection")
        elif meal_type == 'late_night' and location['late_night']:
            explanation_parts.append("Open late")
            
        # Format final explanation
        if explanation_parts:
            return ". ".join(explanation_parts) + "."
        else:
            return "Popular dining option on campus."
    
    def batch_recommendations_for_day(
        self, 
        user_id: str,
        date: datetime = None,
        dietary_filter: List[str] = None,
        discount_only: bool = False
    ) -> Dict[str, List[Dict]]:
        """
        Generate batch recommendations for each meal of the day
        
        Args:
            user_id: User identifier
            date: Date to generate recommendations for (defaults to today)
            dietary_filter: List of dietary restrictions to filter by
            discount_only: Whether to only include locations with meal plan discounts
            
        Returns:
            Dictionary of meal types with recommended locations
        """
        if not date:
            date = datetime.now()
        
        # Generate times for each meal
        breakfast_time = datetime.combine(date.date(), time(8, 0))
        lunch_time = datetime.combine(date.date(), time(12, 0))
        dinner_time = datetime.combine(date.date(), time(18, 0))
        late_night_time = datetime.combine(date.date(), time(22, 0))
        
        # Get recommendations for each meal
        breakfast_recs = self.get_recommendations(
            user_id=user_id,
            meal_type='breakfast',
            time_of_day='morning',
            dietary_filter=dietary_filter,
            discount_only=discount_only,
            current_time=breakfast_time,
            num_recommendations=2
        )
        
        lunch_recs = self.get_recommendations(
            user_id=user_id,
            meal_type='lunch',
            time_of_day='afternoon',
            dietary_filter=dietary_filter,
            discount_only=discount_only,
            current_time=lunch_time,
            num_recommendations=2
        )
        
        dinner_recs = self.get_recommendations(
            user_id=user_id,
            meal_type='dinner',
            time_of_day='evening',
            dietary_filter=dietary_filter,
            discount_only=discount_only,
            current_time=dinner_time,
            num_recommendations=2
        )
        
        late_night_recs = self.get_recommendations(
            user_id=user_id,
            meal_type='late_night',
            time_of_day='night',
            dietary_filter=dietary_filter,
            discount_only=discount_only,
            current_time=late_night_time,
            num_recommendations=1
        )
        
        return {
            'breakfast': breakfast_recs,
            'lunch': lunch_recs,
            'dinner': dinner_recs,
            'late_night': late_night_recs
        }

# Example usage
if __name__ == "__main__":
    # Create and fit the recommendation system
    recommender = MealRecommendationSystem()
    recommender.fit()
    
    # Sample user data
    user_transactions = [
        {
            'location': 'Findlay Commons',
            'timestamp': '2023-12-01T08:30:00',
            'amount': 8.50
        },
        {
            'location': 'Starbucks HUB',
            'timestamp': '2023-12-01T10:15:00',
            'amount': 5.25
        },
        {
            'location': 'Findlay Commons',
            'timestamp': '2023-12-02T12:30:00',
            'amount': 12.75
        },
        {
            'location': 'Starbucks HUB',
            'timestamp': '2023-12-03T09:45:00',
            'amount': 5.25
        },
    ]
    
    user_preferences = {
        'dietary_preferences': ['Vegetarian'],
        'cuisines_preferred': ['Asian', 'Italian'],
        'avoid_locations': []
    }
    
    # Update user profile
    recommender.update_user_profile('user123', user_transactions, user_preferences)
    
    # Get recommendations
    recommendations = recommender.get_recommendations('user123', num_recommendations=3)
    print("Recommendations:", recommendations)
    
    # Get daily meal plan
    daily_plan = recommender.batch_recommendations_for_day('user123', discount_only=True)
    print("\nDaily Meal Plan:", daily_plan)