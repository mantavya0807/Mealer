// functions/src/dataProcessor/transactionProcessor.ts

import { Timestamp, getFirestore } from 'firebase-admin/firestore';

interface Transaction {
  timestamp: Timestamp;
  accountType: 'LionCash' | 'CampusMealPlan';
  location: string;  
  amount: number;
  category: string;
  subcategory: string;
}

interface ProcessResult {
  success: boolean;
  transactionCount?: number;
  error?: string;
}

const processTransactionData = (csvData: string): Transaction[] => {
  const pagePattern = /12345678910...\s+Â Page \d+ of \d+, items \d+ to \d+ of \d+./;
  const rawSections = csvData.split(pagePattern);

  // Remove empty sections and duplicates
  const uniqueSections = [...new Set(rawSections.filter(section => section.trim().length > 0))];

  // Process each line into transaction object
  const transactions: Transaction[] = [];
  
  uniqueSections.forEach(section => {
    const lines = section.split('\n').filter(line => line.trim().length > 0);
    
    lines.forEach(line => {
      // Use underscore prefix for unused variables
      const [datetime, accountType, _cardNumber, location, _transactionType, amount] = line.split('\t');
      
      if (!datetime || !accountType || !amount) return;

      // Clean and parse amount
      const cleanAmount = amount.replace(' USD', '').replace('(', '').replace(')', '');
      const parsedAmount = parseFloat(cleanAmount) * (amount.includes('(') ? -1 : 1);

      // Determine category and subcategory based on location
      const { category, subcategory } = categorizePurchase(location);

      transactions.push({
        timestamp: Timestamp.fromDate(new Date(datetime)),
        accountType: accountType as 'LionCash' | 'CampusMealPlan',
        location,
        amount: parsedAmount,
        category,
        subcategory
      });
    });
  });

  return transactions;
};

const categorizePurchase = (location: string) => {
  const categories = {
    'Findlay': 'East',
    'Warnock': 'North',
    'Redifer': 'South',
    'Pollock': 'Pollock',
    'HUB': 'Central'
  };

  const subcategories = {
    'Market': 'Convenience',
    'Starbucks': 'Coffee',
    'Commons': 'Dining Hall',
    'Bluespoon': 'Cafe',
    'WEPA': 'Printing'
  };

  let category = 'Other';
  let subcategory = 'Other';

  // Determine main category
  for (const [key, value] of Object.entries(categories)) {
    if (location.includes(key)) {
      category = value;
      break;
    }
  }

  // Determine subcategory
  for (const [key, value] of Object.entries(subcategories)) {
    if (location.includes(key)) {
      subcategory = value;
      break;
    }
  }

  return { category, subcategory };
};

const uploadTransactions = async (
  transactions: Transaction[], 
  userEmail: string
): Promise<boolean> => {
  try {
    const batch = [];
    const firestore = getFirestore();
    const userTransactionsRef = firestore.collection(`users/${userEmail}/transactions`);

    for (const transaction of transactions) {
      batch.push(
        userTransactionsRef.add({
          ...transaction,
          createdAt: Timestamp.now()
        })
      );
    }

    await Promise.all(batch);
    return true;
  } catch (error) {
    console.error('Error uploading transactions:', error);
    return false;
  }
};

export const processAndUploadTransactions = async (
  csvData: string,
  userEmail: string
): Promise<ProcessResult> => {
  try {
    const transactions = processTransactionData(csvData);
    const uploadSuccess = await uploadTransactions(transactions, userEmail);
    
    if (!uploadSuccess) {
      throw new Error('Failed to upload transactions to database');
    }

    return {
      success: true,
      transactionCount: transactions.length
    };
  } catch (error) {
    console.error('Error processing transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};