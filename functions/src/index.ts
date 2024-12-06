// functions/src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { initiatePSULogin } from './scraper/pennStateScraper.js';
import { processAndUploadTransactions } from './dataProcessor/transactionProcessor.js';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Login and data fetching endpoint
app.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { psuEmail, password, verificationCode, fromDate, toDate } = req.body;

    if (!psuEmail || !password || !verificationCode || !fromDate || !toDate) {
      res.status(400).json({
        error: "Fill in all required fields",
      });
      return;
    }

    console.log('Starting login process for:', psuEmail);
    const result = await initiatePSULogin(psuEmail, password, verificationCode, fromDate, toDate);
    console.log('Login result:', result);
    // Inside the /login endpoint handler where the error occurs
if (result.success) {
  if (result.csvData) {
    console.log('Login successful for:', psuEmail);
    try {
      // Process and upload the CSV data
      console.log('Processing and uploading transactions for:', psuEmail);
      const processResult = await processAndUploadTransactions(result.csvData, psuEmail);
      
      if (processResult.success) {
        res.json({
          success: true,
          message: 'Login successful and transactions processed',
          transactionCount: processResult.transactionCount
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Login successful but failed to process transactions',
          details: processResult.error
        });
      }
    } catch (processError) {
      res.status(500).json({
        success: false,
        error: 'Login successful but failed to process transactions',
        details: processError instanceof Error ? processError.message : 'Unknown error'
      });
    }
  } else {
    res.json({
      success: true,
      message: 'Login successful but no transaction data found'
    });
  }
}

  } catch (error) {
    console.error('Server error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid email')) {
        res.status(400).json({
          error: 'Invalid email address',
          details: error.message
        });
      } else {
        res.status(500).json({
          error: 'Failed to process login request',
          details: error.message
        });
      }
    } else {
      res.status(500).json({
        error: 'Failed to process login request',
        details: 'Unknown error occurred'
      });
    }
  }
});

// Separate endpoint for manual transaction upload
app.post('/upload-transactions', async (req: express.Request, res: express.Response) => {
  try {
    const { csvData, userId } = req.body;
    
    if (!csvData || !userId) {
      res.status(400).json({ 
        error: 'CSV data and userId are required'
      });
      return;
    }

    const processResult = await processAndUploadTransactions(csvData, userId);
    
    if (processResult.success) {
      res.json({ 
        success: true,
        transactionCount: processResult.transactionCount
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Failed to process transactions',
        details: processResult.error
      });
    }
  } catch (error) {
    console.error('Error processing transactions:', error);
    res.status(500).json({ 
      error: 'Failed to process transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export const api = onRequest({
  timeoutSeconds: 540,
  region: 'us-central1',
}, app);