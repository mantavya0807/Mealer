// functions/src/firebase/config.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const initializeFirebaseAdmin = () => {
  try {
    // Log environment variables (without private key) for debugging
    console.log('Project ID:', process.env.GCP_PROJECT_ID);
    console.log('Client Email:', process.env.GCP_CLIENT_EMAIL);
    
    if (!process.env.GCP_PRIVATE_KEY) {
      throw new Error('Private key is not defined in environment variables');
    }

    const privateKey = process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    const serviceAccount = {
      projectId: process.env.GCP_PROJECT_ID,
      clientEmail: process.env.GCP_CLIENT_EMAIL,
      privateKey: privateKey
    };

    // Initialize the app
    const app = initializeApp({
      credential: cert(serviceAccount)
    });

    console.log('Firebase Admin initialized successfully');
    return getFirestore(app);
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
};

export const db = initializeFirebaseAdmin();