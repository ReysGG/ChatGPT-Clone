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

    // Get input elements details (type, id, class, accept, etc.)
    const inputDetails = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map((el, idx) => ({
        index: idx,
        id: el.id,
        name: el.name,
        type: el.type,
        accept: el.getAttribute('accept') || '',
        className: el.className,
        visible: el.offsetParent !== null
      }));
    });
    console.log('Input Details before clicking Add Media:', JSON.stringify(inputDetails, null, 2));

    // Let's click "Add Media"
    console.log('Clicking Add Media button...');
    const buttons = await page.$$('button');
    let addMediaBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Add Media')) {
        addMediaBtn = btn;
        console.log('Found Add Media button.');
        break;
      }
    }

    if (addMediaBtn) {
      await addMediaBtn.click();
      console.log('Clicked Add Media, waiting 2 seconds...');
      await new Promise(r => setTimeout(r, 2000));

      const inputDetailsAfter = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        return inputs.map((el, idx) => ({
          index: idx,
          id: el.id,
          name: el.name,
          type: el.type,
          accept: el.getAttribute('accept') || '',
          className: el.className,
          visible: el.offsetParent !== null
        }));
      });
      console.log('Input Details after clicking Add Media:', JSON.stringify(inputDetailsAfter, null, 2));

      // Check for dropzones or file dialogs
      const otherDetails = await page.evaluate(() => {
        // Look for file inputs, drop zones, or list of uploaded media
        const dropzones = Array.from(document.querySelectorAll('[class*="drop"], [id*="drop"]')).map(el => el.className);
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map(el => ({
          className: el.className,
          id: el.id
        }));
        return { dropzones, fileInputs };
      });
      console.log('Other file-related elements:', JSON.stringify(otherDetails, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

run();
