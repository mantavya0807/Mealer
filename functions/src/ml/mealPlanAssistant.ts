// functions/src/ml/mealPlanAssistant.ts
import { getFirestore } from 'firebase-admin/firestore';
// Import OpenAI directly
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Context data for Penn State dining and meal plans
const CONTEXT_DATA = {
  meal_plans: {
    level1: {
      name: "Level 1",
      cost: 2000,
      value: 2200,
      description: "Basic meal plan for light eaters or students who often eat off-campus."
    },
    level2: {
      name: "Level 2",
      cost: 2800,
      value: 3200,
      description: "Standard meal plan for average campus dining needs. Most popular choice."
    },
    level3: {
      name: "Level 3",
      cost: 3500,
      value: 4200,
      description: "Premium meal plan for students who eat most meals on campus. Best value."
    },
    commuter: {
      name: "Commuter",
      cost: 500,
      value: 550,
      description: "For commuter students who occasionally eat on campus."
    }
  },
  dining_locations: [
    {
      name: "Findlay Commons",
      area: "East",
      type: "Dining Hall",
      meal_plan_discount: true,
      discount_rate: 0.65,
      hours: "7:00 AM - 10:00 PM",
      description: "Full-service dining hall in East Halls with multiple food stations."
    },
    {
      name: "Waring Commons",
      area: "West",
      type: "Dining Hall",
      meal_plan_discount: true,
      discount_rate: 0.65,
      hours: "7:00 AM - 10:00 PM",
      description: "Dining hall in West Halls featuring a variety of international cuisine."
    },
    {
      name: "Redifer Commons",
      area: "South",
      type: "Dining Hall",
      meal_plan_discount: true,
      discount_rate: 0.65,
      hours: "7:00 AM - 10:00 PM",
      description: "South Halls dining facility with extensive menu options."
    },
    {
      name: "North Food District",
      area: "North",
      type: "Dining Hall",
      meal_plan_discount: true,
      discount_rate: 0.65,
      hours: "7:00 AM - 10:00 PM",
      description: "Modern dining hall with diverse food options in North Halls."
    },
    {
      name: "Pollock Commons",
      area: "Pollock",
      type: "Dining Hall",
      meal_plan_discount: true,
      discount_rate: 0.65,
      hours: "7:00 AM - 10:00 PM",
      description: "Centrally located dining hall in Pollock Halls."
    },
    {
      name: "HUB Dining",
      area: "Central",
      type: "Food Court",
      meal_plan_discount: false,
      hours: "7:00 AM - 12:00 AM",
      description: "Central campus food court with multiple restaurants and vendors."
    },
    {
      name: "The Edge Coffee Bar",
      area: "West",
      type: "Coffee Shop",
      meal_plan_discount: false,
      lioncash_discount: 0.10,
      hours: "7:00 AM - 4:00 PM",
      description: "Coffee shop in West Commons offering specialty drinks and pastries."
    }
  ],
  discount_info: {
    meal_plan: {
      dining_commons: 0.65,
      markets: 0,
      hub: 0
    },
    lioncash: {
      all_locations: 0.10,
      excludes: ["vending machines"]
    }
  },
  common_questions: [
    {
      question: "Which meal plan offers the best value?",
      answer: "The Level 3 meal plan offers the best value in terms of discount percentage. It costs $3,500 but provides $4,200 in dining value, which is a 20% bonus. However, the best plan for you depends on how often you eat on campus."
    },
    {
      question: "Where can I use my meal plan discount?",
      answer: "The 65% meal plan discount is only available at the five dining commons: Findlay (East), Waring (West), Redifer (South), North Food District, and Pollock Commons. The discount does not apply at the HUB, markets, or convenience stores."
    },
    {
      question: "How can I maximize my meal plan value?",
      answer: "To maximize your meal plan value, prioritize eating at dining commons where you receive the 65% discount. Avoid using meal plan funds at markets and HUB locations where no discount applies. Consider using LionCash for purchases at locations without meal plan discounts."
    }
  ],
  tips: [
    "Dining commons offer a 65% discount with your meal plan - the best value on campus.",
    "Visit dining commons during off-peak hours (2-4pm, after 7pm) to avoid long lines.",
    "LionCash provides a 10% discount at most campus dining locations.",
    "Markets and convenience stores don't offer meal plan discounts.",
    "Running low on funds? Consider adding LionCash instead of upgrading your meal plan.",
    "Use the Penn State GO app to check dining hall menus and hours before visiting."
  ]
};

// Structured knowledge vector database mock (in a real implementation, this would use a proper vector store)
const knowledgeBase = [
  // Meal plan information sections
  "Penn State offers several meal plans for students. The Level 1 plan costs $2,000 and provides $2,200 in dining value. The Level 2 plan costs $2,800 and provides $3,200 in value. The Level 3 plan costs $3,500 and provides $4,200 in value. The Commuter plan costs $500 and provides $550 in value.",
  "Meal plans offer a 65% discount at all five dining commons locations on campus: Findlay Commons (East), Waring Commons (West), Redifer Commons (South), North Food District, and Pollock Commons.",
  "Penn State meal plans do not provide discounts at markets, convenience stores, or HUB dining locations. For these locations, using LionCash provides a 10% discount.",
  "Students living in East, Pollock, or South halls are required to purchase at least the Level 1 meal plan. Students in North and West halls must purchase at least the Level 2 plan. Commuter students can opt for any plan or no plan.",
  "You can upgrade your meal plan at any point during the semester, but you cannot downgrade once the semester has begun.",
  
  // Dining locations information
  "Penn State has five main dining commons: Findlay Commons (East), Waring Commons (West), Redifer Commons (South), North Food District, and Pollock Commons. All offer the 65% meal plan discount.",
  "The HUB-Robeson Center houses multiple dining options including Burger King, Chick-fil-A, Starbucks, Jamba Juice, and McAlister's Deli. Meal plans can be used here but don't receive the 65% discount.",
  "Campus markets and convenience stores accept meal plans but do not offer the 65% discount. These include locations like Findlay Commons Market, North Food District Market, and Redifer Commons Market.",
  
  // Spending tips and strategies
  "To maximize your meal plan value, prioritize eating at dining commons where the 65% discount applies. This means a $10 meal only costs you $3.50 in meal plan funds.",
  "If eating at markets or the HUB, consider using LionCash instead of meal plan funds to receive the 10% discount.",
  "Students often run out of meal plan funds before the semester ends. To avoid this, track your spending and try to establish a daily or weekly budget.",
  "Meal swaps are no longer offered at Penn State. All dining is a la carte, meaning you pay for exactly what you take.",
  "During fall and spring breaks, dining commons may have limited hours or be closed. Check the Penn State Food Services website for updated schedules.",
  
  // Special dietary information
  "All dining commons offer vegetarian, vegan, and gluten-free options daily. Look for the designated stations or ask dining staff for assistance.",
  "Students with severe food allergies or dietary restrictions can schedule a consultation with Penn State's dietitian through Food Services.",
  "The Penn State Eats mobile ordering app allows you to customize orders and filter by dietary preferences when ordering from participating locations."
];

// Interface for Assistant request
interface AssistantRequest {
  user_id: string;
  query: string;
}

// Interface for Assistant response
interface AssistantResponse {
  answer: string;
  sources?: string[];
  followup_questions?: string[];
}

// Interface for user data
interface UserData {
  mealPlanType: string;
  currentBalance: number;
  frequentLocations: string[];
  dietaryRestrictions: string[];
}

/**
 * Process a user query about meal plans using RAG approach
 */
export const getMealPlanAssistance = async (req: AssistantRequest): Promise<AssistantResponse> => {
  try {
    const { user_id, query } = req;
    
    // Get user-specific data for personalization
    const userData = await getUserData(user_id);
    
    // Select relevant chunks from the knowledge base using similarity search
    // In a real implementation, this would use embeddings and vector search
    const relevantChunks = knowledgeBase.filter(chunk => 
      chunk.toLowerCase().includes(query.toLowerCase()) || 
      query.toLowerCase().split(' ').some(word => 
        word.length > 3 && chunk.toLowerCase().includes(word.toLowerCase())
      )
    );
    
    // If no chunks are found, use general context
    const context = relevantChunks.length > 0 
      ? relevantChunks.join("\n\n") 
      : JSON.stringify(CONTEXT_DATA);
    
    // Format user-specific data for contextual awareness
    const userContext = userData 
      ? `User has a ${userData.mealPlanType} meal plan with ${userData.currentBalance} remaining balance. They tend to eat at ${userData.frequentLocations.join(', ')}. Their dietary preferences are: ${userData.dietaryRestrictions.join(', ') || 'None specified'}.`
      : 'No specific user data available.';
    
    // Prepare the prompt with context enrichment
    const prompt = `
You are a Penn State Meal Plan Assistant, an AI designed to help students make the most of their Penn State dining experience.
Answer the user's question based on the following information:

CONTEXT INFORMATION:
${context}

USER INFORMATION:
${userContext}

USER QUERY:
${query}

Provide a helpful, concise answer based on the context provided. If you're unsure or don't have enough information, acknowledge that and suggest where the user might find more information.
Include 2-3 relevant follow-up questions that the user might want to ask next.
`;

    // Call OpenAI API to generate a response using the modern API
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a Penn State Meal Plan Assistant, designed to provide helpful, accurate information about Penn State dining services and meal plans."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
    
    // Extract the assistant's response
    const assistantResponse = response.choices[0].message.content || "Sorry, I couldn't generate a response.";
    
    // Generate follow-up questions if not included in the response
    const followupQuestions = extractFollowUpQuestions(assistantResponse) || [
      "What dining locations offer the best value for my meal plan?",
      "How can I stretch my meal plan dollars to last the semester?",
      "What are the peak hours at dining commons I should avoid?"
    ];
    
    return {
      answer: assistantResponse.replace(/Follow-up Questions?:?[\s\S]*$/, '').trim(),
      sources: relevantChunks.length > 0 ? relevantChunks : undefined,
      followup_questions: followupQuestions
    };
  } catch (error) {
    console.error('Error in meal plan assistant:', error);
    throw error;
  }
};

/**
 * Extract follow-up questions from assistant response
 */
function extractFollowUpQuestions(text: string): string[] | undefined {
  // Look for a section of follow-up questions
  const followUpRegex = /follow-up questions?:?(.+?)(?=\n\n|$)/si;
  const match = text.match(followUpRegex);
  
  if (match && match[1]) {
    // Extract questions by looking for numbered or bulleted items
    const questionsText = match[1].trim();
    const questions = questionsText
      .split(/(?:\r?\n|^)(?:\d+[\.\)]\s*|\*\s*|\-\s*)/)
      .map(q => q.trim())
      .filter(q => q && q.endsWith('?'));
    
    return questions.length > 0 ? questions : undefined;
  }
  
  return undefined;
}

/**
 * Get user-specific data for context enrichment
 */
async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const db = getFirestore();
    
    // Get user preferences
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      return null;
    }
    
    const userData = userDoc.data() || {};
    
    // Get transaction history to identify frequent locations
    const transactionsRef = db.collection(`users/${userId}/transactions`);
    const transactionsSnapshot = await transactionsRef.limit(100).orderBy('timestamp', 'desc').get();
    
    // Calculate location frequency
    const locationCounts: {[key: string]: number} = {};
    transactionsSnapshot.forEach(doc => {
      const data = doc.data();
      const location = data.location;
      if (location) {
        locationCounts[location] = (locationCounts[location] || 0) + 1;
      }
    });
    
    // Get top 3 frequent locations
    const frequentLocations = Object.entries(locationCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 3)
      .map(([location]) => location);
    
    return {
      mealPlanType: userData.mealPlanType || 'unknown',
      currentBalance: userData.currentBalance || 0,
      frequentLocations: frequentLocations || [],
      dietaryRestrictions: userData.dietaryRestrictions || []
    };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}