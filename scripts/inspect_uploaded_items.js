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

    // Open Uploads
    console.log('Opening Uploads tab...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Uploads')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2000));

    // Inspect the media items (the containers of the uploaded images)
    console.log('Inspecting media item elements...');
    const mediaItemsInfo = await page.evaluate(() => {
      // Find all images that are NOT the avatar
      const imgs = Array.from(document.querySelectorAll('img')).filter(img => !img.src.includes('googleusercontent.com'));
      
      return imgs.map((img, idx) => {
        // Traverse up to find some container or details
        const details = [];
        let current = img.parentElement;
        for (let i = 0; i < 4 && current; i++) {
          details.push({
            tag: current.tagName,
            className: current.className,
            id: current.id,
            role: current.getAttribute('role') || '',
            draggable: current.getAttribute('draggable') || ''
          });
          current = current.parentElement;
        }

        return {
          index: idx,
          src: img.src.substring(0, 100),
          className: img.className,
          hierarchy: details
        };
      });
    });

    console.log('Media Items Info:', JSON.stringify(mediaItemsInfo, null, 2));

    // Let's check what happens if we click the first uploaded image
    console.log('Clicking the first uploaded image...');
    await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img')).filter(img => !img.src.includes('googleusercontent.com'));
      if (imgs.length > 0) {
        imgs[0].click();
      }
    });

    console.log('Clicked. Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));

    // Capture text on screen to see if any popup appeared
    const pageTextAfterClick = await page.evaluate(() => document.body.innerText);
    console.log('--- Page text after clicking image (First 1000 chars) ---');
    console.log(pageTextAfterClick.substring(0, 1000));
    console.log('---------------------------------------------------------');

    // Take screenshot
    const screenshotPath = path.resolve(__dirname, '../public/flow_after_clicking_media.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

run();
