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

    // Upload image
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      console.error('File input not found');
      return;
    }
    const testImagePath = path.resolve(__dirname, '../image.png');
    console.log(`Uploading test image: ${testImagePath}`);
    await fileInput.uploadFile(testImagePath);

    console.log('File uploaded. Waiting 8 seconds...');
    await new Promise(r => setTimeout(r, 8000));

    // Find and click the "Uploads" button in the sidebar
    console.log('Searching for "Uploads" button...');
    const buttons = await page.$$('button');
    let uploadsBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Uploads')) {
        uploadsBtn = btn;
        console.log(`Found Uploads button with text: "${text}"`);
        break;
      }
    }

    if (uploadsBtn) {
      console.log('Clicking Uploads button...');
      await uploadsBtn.click();
      console.log('Clicked Uploads button. Waiting 3 seconds for sidebar/tab to load...');
      await new Promise(r => setTimeout(r, 3000));

      // Take a screenshot of the uploads tab/sidebar
      const screenshotPath = path.resolve(__dirname, '../public/flow_uploads_clicked.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`Screenshot saved to ${screenshotPath}`);

      // List all images now visible on the page (our uploaded image should be there)
      const images = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).map((img, idx) => ({
          index: idx,
          src: img.src.substring(0, 150),
          width: img.width,
          height: img.height,
          className: img.className,
          visible: img.offsetParent !== null
        }));
      });
      console.log('Images visible on page after opening Uploads:', JSON.stringify(images, null, 2));

      // Let's print out the text context of elements inside the media panel
      const mediaPanelElements = await page.evaluate(() => {
        // Find elements inside the media view panel
        // In Google Flow, let's find the card or grid elements
        const els = Array.from(document.querySelectorAll('[class*="grid"], [class*="list"], [class*="panel"], [class*="sidebar"]'));
        return els.filter(el => el.textContent && el.textContent.includes('image.png') || el.textContent.includes('flow-')).map(el => ({
          tag: el.tagName,
          className: el.className,
          text: el.textContent.substring(0, 200).trim()
        }));
      });
      console.log('Media panel elements related to uploads:', JSON.stringify(mediaPanelElements, null, 2));
    } else {
      console.log('Uploads button not found in sidebar.');
    }

  } catch (error) {
    console.error('Error during uploads inspection:', error);
  } finally {
    await browser.close();
  }
}

run();
