import puppeteer from 'puppeteer';

interface LoginResult {
  success: boolean;
  message?: string;
}

export const initiatePSULogin = async (
  psuEmail: string, 
  password: string,
  verificationCode: string
): Promise<LoginResult> => {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000);
    
    // Initial navigation
    await page.goto('http://eliving.psu.edu/', { waitUntil: 'networkidle0' });
    
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

    // Final check and cleanup
    await page.waitForTimeout(2000);
    if (browser) await browser.close();
    
    return {
      success: true,
      message: 'Login successful'
    };

  } catch (error) {
    if (browser) await browser.close();
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};