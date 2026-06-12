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

    // Find the settings trigger button
    console.log('Finding and clicking settings trigger...');
    const buttons = await page.$$('button');
    let triggerBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Nano Banana') || text.includes('crop_'))) {
        triggerBtn = btn;
        console.log(`Found trigger button with text: "${text}"`);
        break;
      }
    }

    if (!triggerBtn) {
      console.log('Trigger button not found by text, searching by selector...');
      // Fallback selector
      triggerBtn = await page.$('.ldbhld');
    }

    if (triggerBtn) {
      await triggerBtn.click();
      console.log('Clicked settings trigger, waiting 2 seconds for popover...');
      await new Promise(r => setTimeout(r, 2000));
      
      // Let's take a screenshot of the popover
      const screenshotPath = path.resolve(__dirname, '../public/flow_popover_screenshot.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`Popover screenshot saved to ${screenshotPath}`);

      // Let's inspect the popover elements
      const popoverElements = await page.evaluate(() => {
        // Find elements with radix popover or general dialog/popover-like elements
        const popover = document.querySelector('[role="dialog"], [data-role="popover"], .radix-popover-content, [id^="radix-"]');
        if (!popover) {
          // If no specific container, scan the whole body for buttons that just appeared
          return { error: 'No popover container found, returning all buttons' };
        }
        
        const buttons = Array.from(popover.querySelectorAll('button'));
        const inputs = Array.from(popover.querySelectorAll('input'));
        const divs = Array.from(popover.querySelectorAll('div'));

        return {
          buttons: buttons.map(btn => ({
            text: btn.textContent?.trim() || '',
            ariaLabel: btn.getAttribute('aria-label') || '',
            className: btn.className || '',
            id: btn.id || ''
          })),
          inputs: inputs.map(inp => ({
            placeholder: inp.getAttribute('placeholder') || '',
            type: inp.getAttribute('type') || '',
            className: inp.className || '',
            value: inp.value || ''
          })),
          divs: divs.filter(d => d.textContent && d.textContent.trim().length > 0 && d.textContent.trim().length < 50).map(d => d.textContent.trim())
        };
      });

      console.log('Popover Elements:', JSON.stringify(popoverElements, null, 2));
    } else {
      console.log('Could not find settings trigger button.');
    }

  } catch (error) {
    console.error('Error during inspection:', error);
  } finally {
    await browser.close();
  }
}

run();
