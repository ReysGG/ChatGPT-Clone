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

    // Listen to console messages
    page.on('console', msg => {
      console.log(`BROWSER CONSOLE [${msg.type()}]: ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.log(`BROWSER ERROR: ${err.message}`);
    });
    
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

    // Find the file input
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      console.error('File input not found');
      return;
    }

    const testImagePath = path.resolve(__dirname, '../image.png');
    console.log(`Uploading test image: ${testImagePath}`);
    await fileInput.uploadFile(testImagePath);

    console.log('File uploaded. Waiting 15 seconds for processing...');
    await new Promise(r => setTimeout(r, 15000));

    // Let's capture the text on the page
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('--- Page text (First 2000 chars) ---');
    console.log(pageText.substring(0, 2000));
    console.log('------------------------------------');

    // Screenshot
    const screenshotPath = path.resolve(__dirname, '../public/flow_upload_debug.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

  } catch (error) {
    console.error('Error during upload test:', error);
  } finally {
    await browser.close();
  }
}

run();
