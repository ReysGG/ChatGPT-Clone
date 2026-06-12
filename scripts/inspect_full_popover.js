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

    // Find all buttons before clicking to verify
    const initialButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(el => el.textContent.trim());
    });
    console.log('Initial buttons:', initialButtons);

    // Click the trigger button
    let clicked = false;
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Nano Banana') || text.includes('crop_'))) {
        await btn.click();
        console.log(`Clicked trigger button: "${text}"`);
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      console.log('Trying fallback class click...');
      const trigger = await page.$('.ldbhld');
      if (trigger) {
        await trigger.click();
        console.log('Clicked .ldbhld');
        clicked = true;
      }
    }

    if (clicked) {
      await new Promise(r => setTimeout(r, 2000));
      
      // Print ALL buttons in the entire document after clicking
      const afterButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map((el, index) => {
          return {
            index,
            text: el.textContent.trim(),
            visible: el.offsetParent !== null,
            className: el.className,
            ariaLabel: el.getAttribute('aria-label') || ''
          };
        });
      });

      console.log('All buttons after clicking:', JSON.stringify(afterButtons, null, 2));

      // Check if there are elements with text containing ratios like "16:9" or "crop_" or "Image"
      const containingSettings = await page.evaluate(() => {
        const matches = [];
        const allEls = document.querySelectorAll('*');
        allEls.forEach(el => {
          if (el.children.length === 0 && el.textContent) {
            const text = el.textContent.trim();
            if (['16:9', '4:3', '1:1', '3:4', '9:16', 'Image', 'Video'].includes(text)) {
              matches.push({
                tag: el.tagName,
                text: text,
                className: el.className,
                parentId: el.parentElement?.id,
                parentTag: el.parentElement?.tagName,
                parentClass: el.parentElement?.className
              });
            }
          }
        });
        return matches;
      });
      console.log('Settings related elements:', JSON.stringify(containingSettings, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

run();
