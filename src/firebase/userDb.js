// src/firebase/userDb.js
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth } from './config';

export const saveUserPreferences = async (userId, preferences) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...preferences,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving preferences:', error);
    throw error;
  }
};

export const getUserPreferences = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting preferences:', error);
    throw error;
  }
};

export const deleteUserAccount = async (userId) => {
  try {
    // Delete user data from Firestore
    await deleteDoc(doc(db, 'users', userId));

    // Delete user from Firebase Auth
    await deleteUser(auth.currentUser);
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};