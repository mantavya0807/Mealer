// functions/src/index.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { initiatePSULogin } from './scraper/pennStateScraper.js';
import { processAndUploadTransactions } from './dataProcessor/transactionProcessor.js';
import { logSearch, getSearchHistory, getSearchDetails } from './searchHistory/searchHistoryHandler.js';
import { getAnalytics } from './analytics/transactionAnalytics.js';
import { Timestamp } from 'firebase-admin/firestore';

// Interfaces
interface Transaction {
  accountType: 'LionCash' | 'CampusMealPlan';
  amount: number;
  cardNumber: string;
  category: string;
  createdAt: Timestamp;
  location: string;
  subcategory: string;
  timestamp: Timestamp;
  transactionType: string;
}

interface DateRange {
  from: string;
  to: string;
}

interface Search {
  id: string;
  psuEmail: string;
  dateRange: DateRange;
  timestamp: Timestamp;
  transactionCount: number;
  transactions: Transaction[];
}

interface LoginRequest {
  psuEmail: string;
  password: string;
  verificationCode: string;
  fromDate: string;
  toDate: string;
}

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

// Login and data fetching endpoint
app.post('/login', async (req: Request<any, any, LoginRequest>, res: Response) => {
  try {
    const { psuEmail, password, verificationCode, fromDate, toDate } = req.body;

    // Validate required fields
    if (!psuEmail || !password || !verificationCode || !fromDate || !toDate) {
      return res.status(400).json({
        error: "Fill in all required fields",
      });
    }

    console.log('Starting login process for:', psuEmail);
    const result = await initiatePSULogin(psuEmail, password, verificationCode, fromDate, toDate);

    if (result.success && result.csvData) {
      try {
        // Process and upload transactions
        const processResult = await processAndUploadTransactions(result.csvData, psuEmail);
        
        if (processResult.success) {
          // Log the search
          const searchId = await logSearch(psuEmail, { from: fromDate, to: toDate });
          
          // Get analytics for the newly processed data
          const analytics = await getAnalytics(psuEmail);
          
          return res.json({
            success: true,
            message: 'Login successful and transactions processed',
            searchId,
            transactionCount: processResult.transactionCount,
            analytics // Include analytics in the response
          });
        }
        
        return res.status(500).json({
          success: false,
          error: 'Login successful but failed to process transactions',
          details: processResult.error
        });
      } catch (processError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to process transactions',
          details: processError instanceof Error ? processError.message : 'Unknown error'
        });
      }
    }

    return res.json({
      success: true,
      message: 'Login successful but no transaction data found'
    });

  } catch (error) {
    console.error('Server error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid email')) {
        return res.status(400).json({
          error: 'Invalid email address',
          details: error.message
        });
      }
      
      return res.status(500).json({
        error: 'Failed to process login request',
        details: error.message
      });
    }
    
    return res.status(500).json({
      error: 'Failed to process login request',
      details: 'Unknown error occurred'
    });
  }
});

// Get all searches
app.get('/searches', async (_req: Request, res: Response) => {
  try {
    const searches = await getSearchHistory();
    
    const formattedSearches = searches.map((search: Search) => ({
      id: search.id,
      psuEmail: search.psuEmail,
      dateRange: search.dateRange,
      timestamp: search.timestamp.toDate(),
      transactionCount: search.transactionCount,
      hasTransactions: search.transactions?.length > 0
    }));

    return res.json({ searches: formattedSearches });
  } catch (error) {
    console.error('Error fetching searches:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch searches',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific search details
app.get('/searches/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Search ID is required' });
    }

    const search = await getSearchDetails(id);
    if (!search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    const formattedSearch = {
      ...search,
      timestamp: search.timestamp.toDate(),
      transactions: search.transactions.map((t: Transaction) => ({
        ...t,
        timestamp: t.timestamp.toDate(),
        createdAt: t.createdAt.toDate(),
      })),
    };

    return res.json(formattedSearch);
  } catch (error) {
    console.error('Error fetching search details:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch search details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get analytics for a specific email
app.get('/analytics/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    const analytics = await getAnalytics(email);
    return res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get analytics for multiple emails
app.post('/analytics/compare', async (req: Request, res: Response) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: 'Array of emails is required' });
    }

    const analyticsPromises = emails.map(email => getAnalytics(email));
    const analyticsResults = await Promise.all(analyticsPromises);

    const comparativeAnalytics = emails.reduce((acc, email, index) => {
      acc[email] = analyticsResults[index];
      return acc;
    }, {} as Record<string, any>);

    return res.json(comparativeAnalytics);
  } catch (error) {
    console.error('Error fetching comparative analytics:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch comparative analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export the api
export const api = onRequest({
  timeoutSeconds: 540, // 9 minutes
  region: 'us-central1',
  minInstances: 0,
  maxInstances: 100,
}, app);