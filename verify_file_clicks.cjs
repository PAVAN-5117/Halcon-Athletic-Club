const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const rootIndex = path.resolve('index.html');
const distIndex = path.resolve('dist', 'index.html');

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
  
  // Test 1: Open Root index.html via file://
  console.log('--- Test 1: Open root index.html via file:// ---');
  const page1 = await browser.newPage();
  const errors1 = [];
  page1.on('pageerror', err => errors1.push(err.message));
  
  const rootUrl = 'file:///' + rootIndex.replace(/\\/g, '/');
  console.log('Opening:', rootUrl);
  await page1.goto(rootUrl, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  console.log('Final URL after redirect:', page1.url());
  console.log('Page Title:', await page1.title());
  const h1_1 = await page1.evaluate(() => document.querySelector('h1')?.innerText);
  console.log('H1 Text:', h1_1);
  console.log('Page Errors:', errors1);

  // Test 2: Open Dist index.html via file://
  console.log('\n--- Test 2: Open dist index.html directly via file:// ---');
  const page2 = await browser.newPage();
  const errors2 = [];
  page2.on('pageerror', err => errors2.push(err.message));

  const distUrl = 'file:///' + distIndex.replace(/\\/g, '/');
  console.log('Opening:', distUrl);
  await page2.goto(distUrl, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  console.log('URL:', page2.url());
  console.log('Page Title:', await page2.title());
  const h1_2 = await page2.evaluate(() => document.querySelector('h1')?.innerText);
  console.log('H1 Text:', h1_2);
  console.log('Page Errors:', errors2);

  // Test 3: Navigate between routes in file:// mode
  console.log('\n--- Test 3: Navigating routes on file:// ---');
  await page2.evaluate(() => {
    const navLink = Array.from(document.querySelectorAll('a')).find(a => a.textContent.trim() === 'Memberships');
    if (navLink) navLink.click();
  });
  await new Promise(r => setTimeout(r, 800));
  console.log('Memberships URL:', page2.url());
  const priceText = await page2.evaluate(() => document.body.innerText.includes('₹12,500') && document.body.innerText.includes('₹21,000'));
  console.log('INR Pricing Visible:', priceText);

  await browser.close();
})();
