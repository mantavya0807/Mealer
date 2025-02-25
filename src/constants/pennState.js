/**
 * Penn State University-specific constants for the Meal Plan Optimizer application.
 * Updated for University Park 2024–2025 to include new dining locations, updated meal plan rates,
 * and expanded details on campus dining options and sustainability initiatives.
 */

// Days of the week for consistent ordering in charts and UI
export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Colors for charts and UI elements
export const CHART_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

// Penn State Meal Plan details for 2024–2025 academic year (University Park)
// Updated Campus Meal Plan rates based on the latest approved figures
export const MEAL_PLANS = {
  'level1': { 
    name: 'Level 1', 
    cost: 2567,       // Updated rate (per semester)
    value: 2867,      // Estimated added value reflecting benefits
    description: 'Recommended for light campus eaters who use the plan sparingly.'
  },
  'level2': { 
    name: 'Level 2', 
    cost: 2803, 
    value: 3203,
    description: 'The standard plan recommended for most students with regular on‐campus dining.'
  },
  'level3': { 
    name: 'Level 3', 
    cost: 3019, 
    value: 3519,
    description: 'Premium plan for heavy on-campus diners requiring extensive meal usage.'
  },
  'commuter': { 
    name: 'Commuter', 
    cost: 500, 
    value: 550,
    description: 'For commuter students who eat on campus occasionally (additional funding levels of $250 or $1000 may be available via eLiving).'
  },
  'custom': {
    name: 'Custom Plan',
    cost: 0,
    value: 0,
    description: 'Add your own custom meal plan details'
  }
};

// Penn State Main Campus dining commons locations (unchanged; note there remain five commons)
export const DINING_COMMONS = {
  'FINDLAY': 'East Commons',
  'WARNOCK': 'North Commons',
  'WARING': 'West Commons',
  'REDIFER': 'South Commons',
  'POLLOCK': 'Pollock Commons'
};

// Penn State Main Campus specific locations for categorization.
// Expanded to include new dining options from Fall 2024 and beyond.
export const CAMPUS_LOCATIONS = {
  // HUB Locations and existing spots
  'HUB': 'HUB Dining',
  'HUB-ROBESON': 'HUB Dining',
  'STARBUCKS': 'Starbucks (HUB)',
  'PANDA': 'Panda Express',
  'SBARRO': 'Sbarro Pizza',
  'BURGER KING': 'Burger King',
  'BK': 'Burger King',
  'CHICK-FIL-A': 'Chick-fil-A',
  'CFA': 'Chick-fil-A',
  'HIBACHI-SAN': 'Hibachi-San',
  'MCALISTER': 'McAlister\'s Deli',
  'JAMBA': 'Jamba Juice',
  'SOUP & GARDEN': 'Soup & Garden',
  
  // Other Campus Locations (existing)
  'CREAMERY': 'Berkey Creamery',
  'BERKEY': 'Berkey Creamery',
  'EDGE': 'Edge Coffee Bar',
  'LOUIE': 'Louie\'s Corner Store',
  'BLUE CHIP': 'Blue Chip Bistro',
  'AU BON PAIN': 'Au Bon Pain',
  'CAFE LAURA': 'Cafe Laura',
  'STARBUCKS-PATERNO': 'Starbucks (Paterno Library)',
  'STARBUCKS-IST': 'Starbucks (IST Building)',
  'SAXBYS': 'Saxbys Coffee',
  
  // Residence Halls Markets
  'MARKET': 'Market',
  'MARKET EAST': 'Market East',
  'MARKET NORTH': 'Market North',
  'MARKET POLLOCK': 'Market Pollock',
  'MARKET SOUTH': 'Market South',
  'MARKET WEST': 'Market West',
  
  // New dining options added in Fall 2024
  'STATE CHIK\'N': 'State Chik’n',
  'ALOHA FRESH': 'Aloha Fresh',
  'EAST PHIL CHEESESTEAKS': 'East Philly Cheesesteaks',
  'FRESCO': 'Fresco',
  'TRIPLETT\'S': 'Triplett’s',
  'DEAR JOE': 'Dear Joe: Café and Bakery'
};

// Common meal categories for Penn State dining (remain as before)
export const MEAL_CATEGORIES = {
  'East': 'East Campus Dining',
  'North': 'North Campus Dining',
  'South': 'South Campus Dining',
  'West': 'West Campus Dining',
  'Pollock': 'Pollock Campus Dining',
  'Central': 'Central Campus Dining',
  'HUB': 'HUB Dining',
  'Library': 'Library Dining',
  'Convenience': 'Convenience Stores',
  'Coffee': 'Coffee Shops',
  'Restaurant': 'Restaurants',
  'FastFood': 'Fast Food',
  'Vending': 'Vending Machines'
};

// Meal time definitions for Penn State campus (unchanged)
export const MEAL_TIMES = {
  breakfast: { 
    start: 6, 
    end: 10,
    icon: 'Coffee',
    description: 'Morning meals (6:00 AM - 10:00 AM)'
  },
  lunch: { 
    start: 11, 
    end: 14,
    icon: 'Utensils',
    description: 'Midday meals (11:00 AM - 2:00 PM)'
  },
  dinner: { 
    start: 17, 
    end: 21,
    icon: 'Utensils',
    description: 'Evening meals (5:00 PM - 9:00 PM)'
  },
  lateNight: { 
    start: 21, 
    end: 24,
    icon: 'Moon',
    description: 'Late night dining (9:00 PM - 12:00 AM)'
  }
};

// Typical operating hours for Penn State dining locations (values remain similar)
export const DINING_HOURS = {
  commons: {
    weekday: { open: '7:00 AM', close: '9:00 PM' },
    weekend: { open: '9:00 AM', close: '7:00 PM' }
  },
  hub: {
    weekday: { open: '7:00 AM', close: '10:00 PM' },
    weekend: { open: '9:00 AM', close: '8:00 PM' }
  },
  cafes: {
    weekday: { open: '7:30 AM', close: '7:00 PM' },
    weekend: { open: 'Closed', close: 'Closed' }
  },
  markets: {
    weekday: { open: '7:30 AM', close: '12:00 AM' },
    weekend: { open: '10:00 AM', close: '12:00 AM' }
  }
};

// Penn State meal plan discount rates (unchanged)
export const DISCOUNT_RATES = {
  mealPlan: {
    commons: 0.65,  // 65% discount at dining commons
    markets: 0,
    hub: 0
  },
  lionCash: {
    standard: 0.10, // 10% discount at most locations
    excluded: 0
  }
};

// Penn State semester schedule (approximate dates remain similar)
export const SEMESTER_SCHEDULE = {
  fall: {
    start: '08/15',
    end: '12/15',
    weeks: 16,
    breaks: ['Thanksgiving Break: 11/23-11/27']
  },
  spring: {
    start: '01/10',
    end: '05/10',
    weeks: 16,
    breaks: ['Spring Break: 03/06-03/10']
  },
  summer: {
    start: '05/15',
    end: '08/10',
    weeks: 12,
    breaks: ['Independence Day: 07/04']
  }
};

// Savings tips specific to Penn State meal plans.
// Expanded with new tips related to the trayless dining initiative and new dining options.
export const SAVING_TIPS = [
  {
    id: 'commons-discount',
    title: 'Use dining commons for 65% discount',
    description: 'Your meal plan offers the highest value at campus dining commons where you receive a 65% discount.'
  },
  {
    id: 'avoid-markets',
    title: 'Limit market purchases',
    description: 'Markets and convenience stores don’t offer meal plan discounts. Use LionCash or real money instead.'
  },
  {
    id: 'off-peak',
    title: 'Dine during off-peak hours',
    description: 'Visit dining locations during less busy hours (2–4 PM, after 7 PM) for shorter lines and better service.'
  },
  {
    id: 'meal-deals',
    title: 'Look for meal deals',
    description: 'Some locations offer combo meal deals that provide better value than individual items.'
  },
  {
    id: 'lioncash',
    title: 'Use LionCash for 10% discount',
    description: 'LionCash offers a 10% discount at most dining locations, making it better than cash or credit card.'
  },
  {
    id: 'trayless-dining',
    title: 'Embrace Trayless Dining',
    description: 'Experience Penn State’s new trayless dining policy designed to reduce food waste and promote sustainable practices.'
  },
  {
    id: 'new-dining-spots',
    title: 'Explore New Dining Spots',
    description: 'Try innovative options like State Chik’n, Aloha Fresh, East Philly Cheesesteaks, and Fresco to diversify your on-campus meal experience.'
  }
];

// Helper function to identify Penn State campus location from transaction data
export const identifyPsuLocation = (locationString) => {
  if (!locationString) return 'Unknown';
  
  const location = locationString.toUpperCase();
  
  // Check for dining commons
  for (const [key, value] of Object.entries(DINING_COMMONS)) {
    if (location.includes(key)) {
      return value;
    }
  }
  
  // Check for specific campus locations, including new dining spots
  for (const [key, value] of Object.entries(CAMPUS_LOCATIONS)) {
    if (location.includes(key)) {
      return value;
    }
  }
  
  // Default case - extract first meaningful word and capitalize
  const words = locationString.split(' ');
  let baseWord = words[0];
  
  if (baseWord.toLowerCase() === 'the' || 
      baseWord.toLowerCase() === 'up' || 
      baseWord.toLowerCase() === '-up') {
    baseWord = words[1] || words[0];
  }
  
  if (baseWord.toLowerCase() === 'commons') {
    return 'Dining Commons';
  }
  
  return baseWord.charAt(0).toUpperCase() + baseWord.slice(1).toLowerCase();
};

// Helper function to categorize a transaction
export const categorizePsuTransaction = (location, amount) => {
  const locationUpper = location.toUpperCase();
  
  // Determine location category
  let category = 'Other';
  
  if (locationUpper.includes('STARBUCKS') || 
      locationUpper.includes('SAXBYS') || 
      locationUpper.includes('COFFEE') || 
      locationUpper.includes('EDGE')) {
    category = 'Coffee';
  } 
  else if (locationUpper.includes('MARKET')) {
    category = 'Convenience';
  }
  else if (locationUpper.includes('GRILL') || 
           locationUpper.includes('RESTAURANT')) {
    category = 'Restaurant';
  }
  else if (locationUpper.includes('VENDING') || 
           locationUpper.includes('GILLY')) {
    category = 'Vending';
  }
  else if (locationUpper.includes('FINDLAY')) {
    category = 'East';
  }
  else if (locationUpper.includes('WARNOCK')) {
    category = 'North';
  }
  else if (locationUpper.includes('WARING')) {
    category = 'West';
  }
  else if (locationUpper.includes('REDIFER')) {
    category = 'South';
  }
  else if (locationUpper.includes('POLLOCK')) {
    category = 'Pollock';
  }
  else if (locationUpper.includes('HUB')) {
    category = 'HUB';
  }
  
  // Determine if this transaction is a meal
  const isMeal = amount >= 7.0 && 
                (['East', 'North', 'South', 'West', 'Pollock', 'Restaurant'].includes(category));
  
  // Determine if this is a coffee/snack
  const isSnack = amount < 7.0 && 
                 (['Coffee', 'Vending', 'HUB'].includes(category));
  
  return {
    category,
    isMeal,
    isSnack
  };
};

// Export an object with all constants for easy importing
export const PSU_CONSTANTS = {
  DAYS,
  CHART_COLORS,
  MEAL_PLANS,
  DINING_COMMONS,
  CAMPUS_LOCATIONS,
  MEAL_CATEGORIES,
  MEAL_TIMES,
  DINING_HOURS,
  DISCOUNT_RATES,
  SEMESTER_SCHEDULE,
  SAVING_TIPS,
  identifyPsuLocation,
  categorizePsuTransaction
};

export default PSU_CONSTANTS;
