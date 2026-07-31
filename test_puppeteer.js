const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/employee.html');
  await page.waitForSelector('#empId');
  await page.type('#empId', 'test_frontend');
  await page.type('#empName', 'Test Frontend');
  await page.click('button[type="submit"]'); // Login
  
  await page.waitForSelector('.reg-shift-card');
  const cards = await page.$$('.reg-shift-card');
  await cards[0].click(); // Click first shift
  
  await page.waitForSelector('.reg-radio[value="WORK"]');
  const radios = await page.$$('.reg-radio[value="WORK"]');
  for (const r of radios) {
    await r.click();
  }
  
  page.on('request', req => {
    if (req.url().includes('script.google.com') && req.method() === 'POST') {
      console.log('Payload sent:', req.postData());
    }
  });
  
  await page.click('#regSubmitBtn');
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
