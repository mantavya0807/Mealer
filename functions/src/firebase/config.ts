// functions/src/firebase/config.ts

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  // Try to get credentials from environment first
  const projectId = process.env.FIREBASE_PROJECT_ID || 'meal-plan-optimizer';
  
  initializeApp({
    credential: cert({
      projectId: projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: projectId,
  });
}

export const db = getFirestore();
export default getFirestore;