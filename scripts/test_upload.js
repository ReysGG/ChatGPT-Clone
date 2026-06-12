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

    // Find the file input
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      console.error('File input not found');
      return;
    }

    const testImagePath = path.resolve(__dirname, '../image.png');
    console.log(`Uploading test image: ${testImagePath}`);
    await fileInput.uploadFile(testImagePath);

    console.log('File uploaded. Waiting 8 seconds for processing and rendering...');
    await new Promise(r => setTimeout(r, 8000));

    // Save screenshot
    const screenshotPath = path.resolve(__dirname, '../public/flow_after_upload.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`After upload screenshot saved to ${screenshotPath}`);

    // Print all image src to check if our uploaded image is in the library
    const images = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src.substring(0, 100),
        width: img.width,
        height: img.height,
        className: img.className,
        visible: img.offsetParent !== null
      }));
    });
    console.log('Images on page:', JSON.stringify(images, null, 2));

    // Check DOM for new elements
    const lists = await page.evaluate(() => {
      // Find list items or elements that look like cards or items
      const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="item"], [class*="media"]')).map(el => ({
        className: el.className,
        text: el.textContent?.substring(0, 50).trim()
      }));
      return cards.slice(0, 20);
    });
    console.log('Some media/item elements:', JSON.stringify(lists, null, 2));

  } catch (error) {
    console.error('Error during upload test:', error);
  } finally {
    await browser.close();
  }
}

run();
