const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

function loadGoogleCookies() {
  const cookiesPath = path.resolve(__dirname, '../cookies/google-cookies.json');
  if (!fs.existsSync(cookiesPath)) {
    throw new Error(`Cookie file not found at ${cookiesPath}`);
  }
  const raw = fs.readFileSync(cookiesPath, 'utf-8');
  const cookies = JSON.parse(raw);
  return cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    secure: c.secure ?? true,
    httpOnly: c.httpOnly ?? false,
    sameSite: c.sameSite === 'None' || c.sameSite === 'lax' || c.sameSite === 'strict' ? c.sameSite : undefined
  }));
}

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    console.log('Loading cookies...');
    const cookies = loadGoogleCookies();
    await page.setCookie(...cookies);

    const targetUrl = 'https://labs.google/fx/tools/flow/project/981a1550-9e8f-44e0-a684-324ff105e96d';
    console.log(`Navigating to: ${targetUrl}...`);
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Waiting 5 seconds for page load...');
    await new Promise(r => setTimeout(r, 5000));

    // Save screenshot
    const screenshotPath = path.resolve(__dirname, '../public/flow_project_screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

    // Print URL and check login
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    if (currentUrl.includes('signin') || currentUrl.includes('accounts.google.com')) {
      console.log('ERROR: Redirected to login. Cookies are expired.');
      return;
    }

    // Inspect elements on page
    const elementsInfo = await page.evaluate(() => {
      const selectors = [
        'textarea', 'input', 'button', '[role="button"]', '[contenteditable="true"]'
      ];
      const results = {};
      selectors.forEach(sel => {
        const els = Array.from(document.querySelectorAll(sel));
        results[sel] = els.map(el => {
          return {
            text: el.textContent ? el.textContent.substring(0, 100).trim() : '',
            placeholder: el.getAttribute('placeholder') || '',
            ariaLabel: el.getAttribute('aria-label') || '',
            id: el.id || '',
            className: el.className || '',
            visible: el.offsetParent !== null
          };
        });
      });
      return results;
    });

    console.log('Found Elements:', JSON.stringify(elementsInfo, null, 2));

  } catch (error) {
    console.error('Error during inspection:', error);
  } finally {
    await browser.close();
  }
}

run();
