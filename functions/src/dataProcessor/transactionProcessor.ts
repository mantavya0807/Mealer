import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../firebase/config.js';

interface Transaction {
  timestamp: Timestamp;
  accountType: 'LionCash' | 'CampusMealPlan';
  location: string;  
  amount: number;
  category: string;
  subcategory: string;
  cardNumber: string;
  transactionType: string;
}

const processTransactionData = (csvData: string): Transaction[] => {
  try {
    console.log('Starting to process CSV data...');
    
    // Split by lines and clean up
    const lines = csvData.split('\n')
      .filter(line => line.trim())
      .filter(line => !line.includes('Date/Time Account Name'))
      .filter(line => !line.includes('Page'))
      .filter(line => /^\d/.test(line));

    const transactions: Transaction[] = [];

    for (const line of lines) {
      try {
        // Parse CSV line while handling quoted fields
        const fields: string[] = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        // Push the last field
        fields.push(currentField.trim());

        if (fields.length < 6) {
          console.log('Invalid number of fields:', fields.length, fields);
          continue;
        }

        const [dateTime, accountType, cardNumber, location, transactionType, amount] = fields;

        // Parse date and time
        const [datePart, timePart, period] = dateTime.split(' ');
        const [month, day, year] = datePart.split('/');
        let [hour, minute] = timePart.split(':');
        
        // Convert to 24-hour format
        let hourNum = parseInt(hour);
        if (period === 'PM' && hourNum !== 12) hourNum += 12;
        if (period === 'AM' && hourNum === 12) hourNum = 0;
        
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          hourNum,
          parseInt(minute)
        );

        // Clean and parse amount
        const cleanAmount = amount
          .replace(' USD', '')
          .replace('(', '')
          .replace(')', '')
          .trim();
        const parsedAmount = parseFloat(cleanAmount) * (amount.includes('(') ? -1 : 1);

        if (isNaN(parsedAmount)) {
          console.error('Invalid amount:', amount, 'parsed as:', parsedAmount);
          continue;
        }

        const { category, subcategory } = categorizePurchase(location);

        const transaction = {
          timestamp: Timestamp.fromDate(date),
          accountType: accountType.replace('Campus Meal Plan', 'CampusMealPlan') as 'LionCash' | 'CampusMealPlan',
          cardNumber: cardNumber.trim(),
          location: location.trim(),
          transactionType: transactionType.trim(),
          amount: parsedAmount,
          category,
          subcategory
        };

        console.log('Processed transaction:', transaction);
        transactions.push(transaction);
      } catch (err) {
        console.error('Error processing line:', line, err);
      }
    }

    console.log(`Successfully processed ${transactions.length} transactions`);
    return transactions;
  } catch (error) {
    console.error('Error in processTransactionData:', error);
    throw error;
  }
};

const categorizePurchase = (location: string) => {
  const categories = {
    'Findlay': 'East',
    'Warnock': 'North',
    'Redifer': 'South',
    'Pollock': 'Pollock',
    'HUB': 'Central',
    'Gilly': 'Vending',
    'Edge': 'West',
    'Waring': 'West'  // Added this mapping
  };

  const subcategories = {
    'Market': 'Convenience',
    'Starbucks': 'Coffee',
    'Commons': 'Dining Hall',
    'Bluespoon': 'Cafe',
    'Grill': 'Restaurant',
    'Vending': 'Vending',
    'Gilly': 'Vending',
    'Flipps': 'Online Order',
    'Edge': 'Coffee Shop',
    'Deli': 'Fresh Food',
    'Salad': 'Fresh Food',
    'Urban Gard': 'Fresh Food',
    'Wing': 'Restaurant'
  };

  let category = 'Other';
  let subcategory = 'Other';

  for (const [key, value] of Object.entries(categories)) {
    if (location.includes(key)) {
      category = value;
      break;
    }
  }

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
    console.log(`Starting upload of ${transactions.length} transactions for ${userEmail}`);
    
    // First, delete all existing transactions for the user
    const userTransactionsRef = db.collection(`users/${userEmail}/transactions`);
    
    // Get all existing transactions
    const existingDocs = await userTransactionsRef.get();
    
    // If there are existing documents, delete them in batches
    if (!existingDocs.empty) {
      console.log(`Found ${existingDocs.size} existing transactions to delete`);
      
      // Delete in batches of 500 (Firestore limit)
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < existingDocs.docs.length; i += batchSize) {
        const batch = db.batch();
        const documents = existingDocs.docs.slice(i, i + batchSize);
        
        documents.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        batches.push(batch.commit());
      }
      
      // Wait for all delete batches to complete
      await Promise.all(batches);
      console.log('Successfully deleted existing transactions');
    }

    // Now upload new transactions in batches
    const uploadBatches = [];
    const uploadBatchSize = 500;

    for (let i = 0; i < transactions.length; i += uploadBatchSize) {
      const batch = db.batch();
      const batchTransactions = transactions.slice(i, i + uploadBatchSize);
      
      batchTransactions.forEach(transaction => {
        const docRef = userTransactionsRef.doc();
        batch.set(docRef, {
          ...transaction,
          createdAt: Timestamp.now()
        });
      });
      
      uploadBatches.push(batch.commit());
    }

    // Wait for all upload batches to complete
    await Promise.all(uploadBatches);
    console.log(`Successfully uploaded ${transactions.length} transactions`);
    return true;
  } catch (error) {
    console.error('Error during transaction upload:', error);
    return false;
  }
};

export const processAndUploadTransactions = async (
  csvData: string,
  userEmail: string
) => {
  try {
    console.log('Starting transaction processing for:', userEmail);
    const transactions = processTransactionData(csvData);
    
    if (transactions.length === 0) {
      return {
        success: false,
        error: 'No valid transactions found in data'
      };
    }

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