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
    
    const lines = csvData.split('\n')
      .filter(line => line.trim())
      .filter(line => !line.includes('Date/Time Account Name'))
      .filter(line => !line.includes('Page'))
      .filter(line => /^\d/.test(line));

    const transactions: Transaction[] = [];

    for (const line of lines) {
      console.log('Processing line:', line);

      const fields = line.split('\t').map(field => field.trim());
      
      if (fields.length < 6) {
        console.log('Invalid number of fields:', fields.length, fields);
        continue;
      }

      const [dateTime, accountType, cardNumber, location, transactionType, amount] = fields;

      try {
        const [datePart, timePart] = dateTime.split(' ');
        const [month, day, year] = datePart.split('/');
        const [hour, minute] = timePart.split(':');
        
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute)
        );

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
    'Edge': 'West'
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
    'Edge': 'Coffee Shop'
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
    
    const batch = db.batch();
    const userTransactionsRef = db.collection(`users/${userEmail}/transactions`);

    transactions.forEach(transaction => {
      const docRef = userTransactionsRef.doc();
      batch.set(docRef, {
        ...transaction,
        createdAt: Timestamp.now()
      });
    });

    await batch.commit();
    console.log(`Successfully uploaded ${transactions.length} transactions`);
    return true;
  } catch (error) {
    console.error('Error uploading transactions:', error);
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