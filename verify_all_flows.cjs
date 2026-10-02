const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5174';
const SCREENSHOT_DIR = path.join(__dirname, 'qa_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const routes = [
  { name: 'home', path: '/' },
  { name: 'club', path: '/club' },
  { name: 'training', path: '/training' },
  { name: 'coaches', path: '/coaches' },
  { name: 'memberships', path: '/memberships' },
  { name: 'schedule', path: '/schedule' },
  { name: 'journal', path: '/journal' },
  { name: 'article', path: '/journal/zone-2-training-quiet-engine-of-longevity' },
  { name: 'contact', path: '/contact' },
  { name: 'login', path: '/login' },
  { name: 'privacy', path: '/privacy' },
  { name: 'terms', path: '/terms' },
  { name: 'accessibility', path: '/accessibility' },
  { name: 'not_found', path: '/non-existent-page' }
];

const viewports = [
  { width: 375, height: 812, label: '375px' },
  { width: 768, height: 1024, label: '768px' },
  { width: 1280, height: 900, label: '1280px' },
  { width: 1920, height: 1080, label: '1920px' }
];

const results = {
  consoleErrors: [],
  networkErrors: [],
  overflows: [],
  flowResults: []
};

async function runFullVerification() {
  console.log('--- STARTING COMPREHENSIVE QA PASS ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
      results.consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('response', response => {
    if (!response.ok() && response.status() !== 304) {
      const url = response.url();
      if (!url.includes('/non-existent-page')) {
        console.log(`[NETWORK FAIL ${response.status()}] ${url}`);
        results.networkErrors.push({ status: response.status(), url });
      }
    }
  });

  // 1. Test responsive viewports & check overflow
  console.log('\n--- 1. Testing responsive viewports & capturing screenshots ---');
  for (const route of routes) {
    for (const vp of viewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 200));

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (overflow) {
        console.log(`[OVERFLOW] Route ${route.path} has horizontal overflow at ${vp.label}`);
        results.overflows.push({ route: route.path, viewport: vp.label });
      }

      if (vp.label === '1280px') {
        const screenshotPath = path.join(SCREENSHOT_DIR, `${route.name}_1280px.png`);
        await page.screenshot({ path: screenshotPath });
      }
    }
    console.log(`✓ Tested route: ${route.path}`);
  }

  // Set desktop viewport for flow tests
  await page.setViewport({ width: 1280, height: 900 });

  // 2. Interactive Flows
  console.log('\n--- 2. Testing interactive business flows ---');

  // Flow A: Find-Your-Fit Quiz on Home
  try {
    console.log('Testing Find-Your-Fit Quiz...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });
    
    // Scroll to quiz and start
    await page.waitForSelector('#start-fit-quiz');
    await page.evaluate(() => {
      const btn = document.querySelector('#start-fit-quiz');
      if (btn) {
        btn.scrollIntoView({ behavior: 'instant', block: 'center' });
        btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Answer 4 questions
    for (let step = 0; step < 4; step++) {
      await page.waitForSelector('.quiz-option-btn');
      await page.evaluate(() => {
        const optionButtons = Array.from(document.querySelectorAll('.quiz-option-btn'));
        if (optionButtons.length > 0) {
          optionButtons[0].click();
        }
      });
      await new Promise(r => setTimeout(r, 600));
    }

    const quizPassed = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('your recommendation') && text.includes('book a private tour');
    });
    console.log('Quiz Flow Result:', quizPassed ? 'PASS' : 'FAIL');
    results.flowResults.push({ flow: 'Find-Your-Fit Quiz', success: quizPassed });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow_quiz_success.png') });
  } catch (err) {
    console.error('Quiz Flow Error:', err.message);
    results.flowResults.push({ flow: 'Find-Your-Fit Quiz', success: false, error: err.message });
  }

  // Flow B: Tour Booking on /contact
  try {
    console.log('Testing Tour Booking on /contact...');
    await page.goto(`${BASE_URL}/contact`, { waitUntil: 'networkidle0' });
    
    await page.type('#tour-contact-name', 'Alexander Vance');
    await page.type('#tour-contact-email', 'alexander.vance@austinpartners.org');
    await page.type('#tour-contact-phone', '(512) 555-8392');

    await page.evaluate(() => {
      const dateInput = document.querySelector('#tour-contact-date');
      if (dateInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(dateInput, '2026-10-25');
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 500));

    // Select available time slot (e.g. 10:00 AM)
    await page.evaluate(() => {
      const slotBtns = Array.from(document.querySelectorAll('button')).filter(b => 
        (b.textContent.trim() === '10:00 AM' || b.textContent.trim() === '12:00 PM') && !b.disabled
      );
      if (slotBtns.length > 0) slotBtns[0].click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Submit tour
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Book Your Tour'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1800));

    const tourPassed = await page.evaluate(() => {
      return document.body.innerText.includes("You're booked") && document.body.innerText.includes('Amara Reyes');
    });
    console.log('Tour Booking Result:', tourPassed ? 'PASS' : 'FAIL');
    results.flowResults.push({ flow: 'Tour Booking', success: tourPassed });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow_tour_success.png') });
  } catch (err) {
    console.error('Tour Booking Error:', err.message);
    results.flowResults.push({ flow: 'Tour Booking', success: false, error: err.message });
  }

  // Flow C: Schedule Reservation & Calendar ICS on /schedule
  try {
    console.log('Testing Class Reservation on /schedule...');
    await page.goto(`${BASE_URL}/schedule`, { waitUntil: 'networkidle0' });

    // Click Book Session on an open class
    await page.evaluate(() => {
      const bookBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Book Session');
      if (bookBtns.length > 0) bookBtns[0].click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.type('#book-name', 'Rachel Mitchell');
    await page.type('#book-email', 'rachel.m@austinproduct.org');
    
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Confirm Reservation'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1800));

    const bookingPassed = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('reservation confirmed') && text.includes('add to calendar');
    });
    console.log('Class Booking Result:', bookingPassed ? 'PASS' : 'FAIL');
    results.flowResults.push({ flow: 'Class Booking', success: bookingPassed });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow_class_booking_success.png') });
  } catch (err) {
    console.error('Class Booking Error:', err.message);
    results.flowResults.push({ flow: 'Class Booking', success: false, error: err.message });
  }

  // Flow D: Schedule Waitlist on /schedule
  try {
    console.log('Testing Schedule Waitlist on /schedule...');
    await page.goto(`${BASE_URL}/schedule`, { waitUntil: 'networkidle0' });

    // Click Waitlist on a full class
    await page.evaluate(() => {
      const waitlistBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Waitlist');
      if (waitlistBtns.length > 0) waitlistBtns[0].click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.type('#book-name', 'Marcus Sterling');
    await page.type('#book-email', 'm.sterling@austinvc.org');
    
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Join Waitlist'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1800));

    const waitlistPassed = await page.evaluate(() => {
      return document.body.innerText.includes('Waitlist confirmed');
    });
    console.log('Class Waitlist Result:', waitlistPassed ? 'PASS' : 'FAIL');
    results.flowResults.push({ flow: 'Class Waitlist', success: waitlistPassed });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow_class_waitlist_success.png') });
  } catch (err) {
    console.error('Class Waitlist Error:', err.message);
    results.flowResults.push({ flow: 'Class Waitlist', success: false, error: err.message });
  }

  // Flow E: 3-Step Membership Application on /memberships
  try {
    console.log('Testing 3-Step Membership Application on /memberships...');
    await page.goto(`${BASE_URL}/memberships`, { waitUntil: 'networkidle0' });

    // Open Modal
    await page.evaluate(() => {
      const applyBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Apply for Membership'));
      if (applyBtns.length > 0) applyBtns[0].click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Step 1: Details
    await page.type('#app-name', 'Katherine Ross');
    await page.type('#app-email', 'k.ross@austinlaw.com');
    await page.type('#app-phone', '(512) 555-4921');
    
    await page.evaluate(() => {
      const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue'));
      if (continueBtn) continueBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Step 2: Choose Tier
    await page.evaluate(() => {
      const continueBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue'));
      if (continueBtn) continueBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Step 3: Confirm Application
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit Application'));
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 1800));

    const appPassed = await page.evaluate(() => {
      return document.body.innerText.includes('Application received') && document.body.innerText.includes('Amara Reyes');
    });
    console.log('Membership Application Result:', appPassed ? 'PASS' : 'FAIL');
    results.flowResults.push({ flow: 'Membership Application', success: appPassed });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow_membership_application_success.png') });
  } catch (err) {
    console.error('Membership Application Error:', err.message);
    results.flowResults.push({ flow: 'Membership Application', success: false, error: err.message });
  }

  // Flow F: Member Login & Dashboard on /login
  try {
    console.log('Testing Member Login & Dashboard...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });

    await page.type('#login-email', 'rachel.m@austinproduct.org');
    await page.type('#login-password', 'HalcyonPass2026');

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Access Member Portal'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const dashboardPassed = await page.evaluate(() => {
      return document.body.innerText.includes('Rachel') && document.body.innerText.includes('Performance') && document.body.innerText.includes('Recovery Allowance');
    });
    console.log('Login & Dashboard Result:', dashboardPassed ? 'PASS' : 'FAIL');
    results.flowResults.push({ flow: 'Member Login & Dashboard', success: dashboardPassed });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow_dashboard_success.png') });
  } catch (err) {
    console.error('Login & Dashboard Error:', err.message);
    results.flowResults.push({ flow: 'Member Login & Dashboard', success: false, error: err.message });
  }

  // Flow G: Newsletter Subscription on Footer
  try {
    console.log('Testing Newsletter Subscription in Footer...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    await page.type('#newsletter-email', 'reader@austinjournal.org');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Subscribe'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1600));

    const newsletterPassed = await page.evaluate(() => {
      return document.body.innerText.includes('Subscription confirmed');
    });
    console.log('Newsletter Subscription Result:', newsletterPassed ? 'PASS' : 'FAIL');
    results.flowResults.push({ flow: 'Newsletter', success: newsletterPassed });
  } catch (err) {
    console.error('Newsletter Error:', err.message);
    results.flowResults.push({ flow: 'Newsletter', success: false, error: err.message });
  }

  // Flow H: Concierge Chat Bubble
  try {
    console.log('Testing Concierge Chat...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      const chatBtn = document.querySelector('button[aria-label*="concierge chat"]');
      if (chatBtn) chatBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    await page.evaluate(() => {
      const replyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('What are your hours?'));
      if (replyBtn) replyBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    const chatPassed = await page.evaluate(() => {
      return document.body.innerText.includes('5:00 AM to 11:00 PM');
    });
    console.log('Concierge Chat Result:', chatPassed ? 'PASS' : 'FAIL');
    results.flowResults.push({ flow: 'Concierge Chat', success: chatPassed });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'flow_chat_success.png') });
  } catch (err) {
    console.error('Concierge Chat Error:', err.message);
    results.flowResults.push({ flow: 'Concierge Chat', success: false, error: err.message });
  }

  // Save report
  fs.writeFileSync(path.join(__dirname, 'verification_report.json'), JSON.stringify(results, null, 2));
  console.log('\n--- VERIFICATION SUMMARY ---');
  console.log(`Console Errors: ${results.consoleErrors.length}`);
  console.log(`Network Errors: ${results.networkErrors.length}`);
  console.log(`Overflows: ${results.overflows.length}`);
  console.log('Flow Results:', JSON.stringify(results.flowResults, null, 2));

  await browser.close();
}

runFullVerification().catch(err => {
  console.error('Fatal QA error:', err);
  process.exit(1);
});
