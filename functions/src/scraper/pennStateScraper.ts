import puppeteer, { Page } from 'puppeteer';
import { stringify } from 'csv-stringify/sync';

// In pennStateScraper.ts, update your interface:
interface LoginResult {
  success: boolean;
  message?: string;
  csvData?: string;  // The CSV data if successfully retrieved
  userId?: string;   // The user ID for storing transactions
}

interface Transaction {
  datetime: string;
  accountName: string;
  cardNumber: string;
  location: string;
  transactionType: string;
  amount: string;
}

// Function to extract data from the table
async function extractTableData(page: Page): Promise<Transaction[]> {
  console.log('Extracting data from the current table page...');
  const transactions = await page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll('#ctl00_MainContent_ResultRadGrid tbody tr')
    );
    return rows.map(row => {
      const cells = Array.from(row.getElementsByTagName('td'));
      return {
        datetime: cells[0]?.textContent?.trim() || '',
        accountName: cells[1]?.textContent?.trim() || '',
        cardNumber: cells[2]?.textContent?.trim() || '',
        location: cells[3]?.textContent?.trim() || '',
        transactionType: cells[4]?.textContent?.trim() || '',
        amount: cells[5]?.textContent?.trim() || ''
      };
    });
  });
  console.log(`Extracted ${transactions.length} transactions from this page.`);
  return transactions;
}

// Function to get total page count from the table's pagination
async function getTablePageCount(page: Page): Promise<number> {
  console.log('Retrieving total number of table pages...');
  const pageCount = await page.evaluate(() => {
    const pagerInfo = document.querySelector('.rgPagerCell .rgInfoPart');
    if (pagerInfo) {
      const match = pagerInfo.textContent?.match(/Page \d+ of (\d+)/);
      return match ? parseInt(match[1]) : 1;
    }
    return 1;
  });
  console.log(`Total table pages found: ${pageCount}`);
  return pageCount;
}

// Function to scrape all transaction history from the paginated table
async function scrapeTransactionHistory(page: Page): Promise<Transaction[]> {
  console.log('Starting to scrape transaction history from the table...');
  let allTransactions: Transaction[] = [];
  const totalPages = await getTablePageCount(page);

  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    console.log(`Scraping table page ${currentPage} of ${totalPages}...`);

    // Extract data from the current table page
    const pageTransactions = await extractTableData(page);
    allTransactions = allTransactions.concat(pageTransactions);

    // Navigate to the next page if not on the last page
    if (currentPage < totalPages) {
      // Construct the selector for the next page link
      const nextPageLinkSelector = `a[title="Go to page ${currentPage + 1}"]`;
      console.log(`Navigating to table page ${currentPage + 1}...`);
      
      // Wait for the next page link to be clickable
      await page.waitForSelector(nextPageLinkSelector, { visible: true });
      
      // Click the next page link and wait for the table to reload
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click(nextPageLinkSelector)
      ]);

      // Wait for the table to reload
      await page.waitForSelector('#ctl00_MainContent_ResultRadGrid tbody tr');
      await page.waitForTimeout(1000);
    }
  }

  console.log(`Finished scraping. Total transactions collected: ${allTransactions.length}`);
  return allTransactions;
}

// Function to save transactions to CSV
async function saveToCSV(transactions: Transaction[]): Promise<string> {
  console.log('Converting transactions to CSV format...');
  try {
    const records = transactions.map(t => ({
      'Date/Time': t.datetime,
      'Account Name': t.accountName,
      'Card Number': t.cardNumber,
      'Location': t.location,
      'Transaction Type': t.transactionType,
      'Amount': t.amount
    }));

    const csvContent = stringify(records, { header: true });
    console.log('CSV content generated successfully.');
    return csvContent;
  } catch (error) {
    console.error('Error generating CSV:', error);
    throw new Error('Failed to generate CSV');
  }
}

// Main function to initiate scraping
export const initiatePSULogin = async (
  psuEmail: string,
  password: string,
  verificationCode: string,
  fromDate: string,
  toDate: string
): Promise<LoginResult> => {
  let browser = null;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(300000);
    
    // Initial navigation
    await page.goto('https://idcard.psu.edu/', { waitUntil: 'networkidle0' });
    
     // Wait for and click the Deposit LionCash button
     console.log('Looking for Deposit LionCash button...');
     await page.waitForSelector('#block-topbuttons > ul > li:nth-child(2) > a');
     await Promise.all([
       page.waitForNavigation({ waitUntil: 'networkidle0' }),
       page.click('#block-topbuttons > ul > li:nth-child(2) > a')
     ]);
 
     // Wait for and click the Sign In button on the new page
     console.log('Looking for Sign In button...');
     await page.waitForSelector('#MainContent_SignInButton');
     await Promise.all([
       page.waitForNavigation({ waitUntil: 'networkidle0' }),
       page.click('#MainContent_SignInButton')
     ]);
     
    // Handle "Use another account" if present
    const hasOtherTileButton = await page.$('#otherTile').catch(() => null);
    if (hasOtherTileButton) {
      await page.click('#otherTile');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }

    // Email input
    await page.waitForSelector('#i0116', { visible: true });
    await page.type('#i0116', psuEmail, { delay: 100 });
    await Promise.all([
      page.waitForNavigation(),
      page.click('#idSIButton9')
    ]);
    await page.waitForTimeout(1000);

    // Password input
    await page.waitForSelector('#i0118', { visible: true });
    await page.type('#i0118', password, { delay: 100 });
    await Promise.all([
      page.waitForNavigation(),
      page.click('#idSIButton9')
    ]);

    // Click "I can't use Microsoft Authenticator"   
    await page.waitForSelector('a#signInAnotherWay');
    await page.click('a#signInAnotherWay');
    
    // Select verification code option
    await page.waitForTimeout(1000);
    await page.waitForSelector('div[data-value="PhoneAppOTP"]');
    await page.click('div[data-value="PhoneAppOTP"]');

    // Enter verification code
    await page.waitForSelector('#idTxtBx_SAOTCC_OTC');
    await page.type('#idTxtBx_SAOTCC_OTC', verificationCode, { delay: 100 });
    
    // Submit verification
    await Promise.all([
      page.waitForNavigation(),
      page.click('#idSubmit_SAOTCC_Continue')
    ]);

    // Press the sign-in button
    await page.waitForSelector('#MainContent_SignInButton');
    await page.click('#MainContent_SignInButton');

    
    // Click the Account transaction button
    await page.waitForSelector('#MasterMenuPanel > div.SiteMenu2 > div > div > div:nth-child(2) > a');
    await page.click('#MasterMenuPanel > div.SiteMenu2 > div > div > div:nth-child(2) > a');
    
      // Handle From Date
    console.log('Entering from date:', fromDate);
    await page.waitForSelector('#ctl00_MainContent_BeginRadDateTimePicker_dateInput', { visible: true });

    // Clear existing value using evaluate
    await page.evaluate(() => {
      const input = document.querySelector('#ctl00_MainContent_BeginRadDateTimePicker_dateInput') as HTMLInputElement;
      if (input) input.value = '';
    });
    await page.type('#ctl00_MainContent_BeginRadDateTimePicker_dateInput', fromDate);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000); // Wait a bit for the date to register

    // Handle To Date
    console.log('Entering to date:', toDate);
    await page.waitForSelector('#ctl00_MainContent_EndRadDateTimePicker_dateInput', { visible: true });

    // Clear existing value using evaluate
    await page.evaluate(() => {
      const input = document.querySelector('#ctl00_MainContent_EndRadDateTimePicker_dateInput') as HTMLInputElement;
      if (input) input.value = '';
    });
    await page.type('#ctl00_MainContent_EndRadDateTimePicker_dateInput', toDate);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500); // Wait a bit for the date to register


    // Click Continue button
    console.log('fuck you ');
    console.log('Clicking Continue button...');
    await page.click('#MainContent_ContinueButton');

    await page.waitForTimeout(2000); // Wait for the page to load
    // Wait for the transaction table to load
    console.log('Waiting for transaction table to load...');
    await page.waitForSelector('#ctl00_MainContent_ResultRadGrid', {
      visible: true,
      timeout: 10000
    });
    console.log('Transaction table loaded.');

    // Scrape transactions from the table
    const transactions = await scrapeTransactionHistory(page);
    console.log(`Successfully scraped ${transactions.length} transactions.`);

    // Save to CSV
    const csvContent = await saveToCSV(transactions);

    // Close browser
    await browser.close();
    console.log('Browser closed.');

    return {
      success: true,
      message: 'Scraping successful',
      csvData: csvContent
    };

  } catch (error) {
    console.error('An error occurred during scraping:', error);
    if (browser) await browser.close();
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};