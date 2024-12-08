// functions/src/searchHistory/searchHistoryHandler.ts

import { getFirestore, Timestamp } from 'firebase-admin/firestore';

interface FirebaseTransaction {
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

interface SearchRecord {
  psuEmail: string;
  dateRange: {
    from: string;
    to: string;
  };
  timestamp: Timestamp;
  transactionCount: number;
  transactions: FirebaseTransaction[];
}

export const logSearch = async (
  psuEmail: string,
  dateRange: { from: string; to: string }
) => {
  try {
    const db = getFirestore();
    
    // Get user's transactions from Firebase
    const userTransactionsRef = db.collection(`users/${psuEmail}/transactions`);
    const transactionsSnapshot = await userTransactionsRef.get();
    const transactions = transactionsSnapshot.docs.map(doc => doc.data() as FirebaseTransaction);
    
    // Filter transactions by date range
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = t.timestamp.toDate();
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      // Add one day to toDate to include the entire last day
      toDate.setDate(toDate.getDate() + 1);
      return transactionDate >= fromDate && transactionDate < toDate;
    });

    // Create search record
    const searchRecord = {
      psuEmail,
      dateRange: {
        from: dateRange.from,
        to: dateRange.to
      },
      timestamp: Timestamp.now(),
      transactionCount: filteredTransactions.length,
      transactions: filteredTransactions
    };

    // Add to searches collection
    const searchRef = await db.collection('searches').add(searchRecord);
    console.log(`Search record created with ID: ${searchRef.id}`);
    
    return {
      success: true,
      searchId: searchRef.id,
      transactionCount: filteredTransactions.length,
      transactions: filteredTransactions
    };
  } catch (error) {
    console.error('Error logging search:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to log search');
  }
};

export const getSearchHistory = async () => {
  try {
    const db = getFirestore();
    const searchesRef = db.collection('searches');
    
    // Get all searches ordered by timestamp
    const snapshot = await searchesRef
      .orderBy('timestamp', 'desc')
      .get();

    const searches = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        psuEmail: data.psuEmail,
        dateRange: data.dateRange,
        timestamp: data.timestamp,
        transactionCount: data.transactionCount,
        transactions: data.transactions?.map((t: FirebaseTransaction) => ({
          ...t,
          timestamp: t.timestamp,
          createdAt: t.createdAt
        })) || []
      };
    });

    return searches;
  } catch (error) {
    console.error('Error fetching search history:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch search history');
  }
};

export const getSearchDetails = async (searchId: string) => {
  try {
    const db = getFirestore();
    const searchDoc = await db.collection('searches').doc(searchId).get();
    
    if (!searchDoc.exists) {
      throw new Error('Search record not found');
    }

    const searchData = searchDoc.data() as SearchRecord;
    
    return {
      ...searchData,
      id: searchDoc.id,
      transactions: searchData.transactions?.map(t => ({
        ...t,
        timestamp: t.timestamp,
        createdAt: t.createdAt
      })) || []
    };
  } catch (error) {
    console.error('Error fetching search details:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch search details');
  }
};