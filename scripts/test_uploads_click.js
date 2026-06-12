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

    console.log('File uploaded. Waiting 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));

    // Find any element containing the word 'Uploads' or 'drive_folder_upload'
    console.log('Searching for Uploads click targets...');
    const targets = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const matches = [];
      allElements.forEach(el => {
        if (el.textContent && (el.textContent.includes('Uploads') || el.textContent.includes('drive_folder_upload'))) {
          // Only take elements with no children (leaves) or small elements
          if (el.children.length <= 1) {
            matches.push({
              tag: el.tagName,
              text: el.textContent.trim(),
              className: el.className,
              id: el.id
            });
          }
        }
      });
      return matches;
    });
    console.log('Found upload targets:', JSON.stringify(targets, null, 2));

    // Click the best match
    const clickSuccess = await page.evaluate(() => {
      // Find leaf element containing 'Uploads' or 'drive_folder_upload'
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        if (el.textContent && (el.textContent.includes('Uploads') || el.textContent.includes('drive_folder_upload'))) {
          if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button' || el.className.includes('button') || el.className.includes('Item')) {
            el.click();
            return { success: true, clickedTag: el.tagName, text: el.textContent.trim() };
          }
        }
      }
      
      // Fallback: click any element that has 'Uploads' and small number of children
      for (const el of allElements) {
        if (el.textContent && el.textContent.trim() === 'Uploads') {
          el.click();
          return { success: true, clickedTag: el.tagName, text: el.textContent.trim(), fallback: true };
        }
      }
      return { success: false };
    });

    console.log('Click result:', clickSuccess);

    if (clickSuccess.success) {
      console.log('Waiting 5 seconds after clicking...');
      await new Promise(r => setTimeout(r, 5000));

      // Screenshot
      const screenshotPath = path.resolve(__dirname, '../public/flow_uploads_clicked_success.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`Screenshot saved to ${screenshotPath}`);

      // Inspect images on page
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
      console.log('Images after click:', JSON.stringify(images, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

run();
