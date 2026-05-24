import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('Opening bills page on port 5189...');
    await page.goto('http://localhost:5189/_app/bills/', { waitUntil: 'networkidle' });
    
    console.log('✅ Bills page loaded');
    
    // Take screenshot
    await page.screenshot({ path: 'bills-page.png' });
    console.log('✅ Screenshot saved');
    
    // Get all buttons
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons`);
    
    // Find Add Expense button
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes('Add Expense')) {
        console.log('✅ Found "Add Expense" button, clicking...');
        await btn.click();
        break;
      }
    }
    
    await page.waitForTimeout(1000);
    console.log('✅ Dialog should be open');
    
    // Fill form
    const inputs = await page.locator('input').all();
    if (inputs.length > 0) {
      await inputs[0].fill('cloudflare hosting');
      console.log('✅ Bill name entered');
    }
    
    if (inputs.length > 1) {
      await inputs[1].fill('5000');
      console.log('✅ Amount entered');
    }
    
    // Select interval
    const selects = await page.locator('select').all();
    if (selects.length > 0) {
      await selects[0].selectOption('monthly');
      console.log('✅ Interval selected');
    }
    
    // Submit
    const submitBtns = await page.locator('button').all();
    for (const btn of submitBtns) {
      const text = await btn.textContent();
      if (text && (text.includes('Create') || text.includes('Save'))) {
        await btn.click();
        console.log('✅ Form submitted');
        break;
      }
    }
    
    await page.waitForTimeout(2000);
    
    // Check if bill appears
    const billText = await page.locator('text=cloudflare hosting').count();
    if (billText > 0) {
      console.log('✅ SUCCESS: Bill created and visible');
    } else {
      console.log('⚠️ Bill not visible, taking screenshot...');
      await page.screenshot({ path: 'bills-page-after.png' });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
})();
