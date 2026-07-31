const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[PAGE ${msg.type().toUpperCase()}] ${msg.text()}`);
    }
  });

  console.log("Navigating to index.html...");
  await page.goto(`file://${__dirname}/index.html`, { waitUntil: 'networkidle2' });

  try {
    // Check if the page is loaded
    await page.waitForSelector('#appTitle', { timeout: 5000 });
    console.log("Page loaded. Navigating to registration tab...");
    
    // Switch to tab Dang Ky Lich
    await page.evaluate(() => {
      document.querySelector('[data-tab="dangKyLich"]').click();
    });

    await page.waitForTimeout(1000);

    // Simulate input
    await page.type('#empId', 'Ops123456');
    await page.type('#empName', 'Test User');
    await page.type('#empPhone', '0901234567');
    
    // Select shift
    const shifts = await page.$$('#shiftList .shift-card');
    if (shifts.length > 0) {
      console.log("Selecting shift...");
      await shifts[0].click();
      await page.waitForTimeout(500);
      
      // Click NEXT
      const nextBtn = await page.$('#nextToStep2Btn');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(500);
        
        console.log("Step 2 loaded. Selecting days...");
        // Select CA for all days
        const inputs = await page.$$('input[value="CA"]');
        for (let input of inputs) {
          await input.evaluate(b => b.click());
        }

        console.log("Submitting...");
        const submitBtn = await page.$('#regSubmitBtn');
        await submitBtn.click();

        // Wait for results
        await page.waitForTimeout(5000);
        
        // Check for success or error toast
        const toast = await page.$('#toastContainer');
        if (toast) {
          const toastText = await page.evaluate(el => el.innerText, toast);
          console.log("Toast message:", toastText);
        } else {
          console.log("No toast found");
        }
      }
    } else {
      console.log("No shifts found to select");
    }

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await browser.close();
  }
})();
