import express from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import { initiatePSULogin } from './scraper/pennStateScraper.js'; // Note the .js extension

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

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
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: 'Login successful' 
        });
      } else {
        res.status(401).json({ 
          success: false,
          error: 'Login failed', 
          details: result.message || 'Invalid credentials'
        });
      }
      
    } catch (error) {
      console.error('Server error:', error);
      
      if (error instanceof Error) {
        res.status(500).json({ 
          error: 'Failed to process login request',
          details: error.message 
        });
      }
    }
});

export const api = onRequest({
  timeoutSeconds: 540,  // Maximum allowed: 540 seconds (9 minutes)
  region: 'us-central1'
}, app);