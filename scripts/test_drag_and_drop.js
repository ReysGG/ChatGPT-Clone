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

    // Find the first image in Uploads
    const imgs = await page.$$('img');
    let targetImg = null;
    for (const img of imgs) {
      const src = await page.evaluate(el => el.src, img);
      if (src && !src.includes('googleusercontent.com')) {
        targetImg = img;
        break;
      }
    }

    if (targetImg) {
      console.log('Found target image for drag. Getting bounding box...');
      const box = await targetImg.boundingBox();
      if (box) {
        console.log(`Image box: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}`);
        
        // Let's drag the image to the center of the canvas (e.g. x=800, y=450)
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const endX = 800;
        const endY = 450;

        console.log(`Simulating drag-and-drop from (${startX}, ${startY}) to (${endX}, ${endY})...`);
        
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        // Move in steps to simulate smooth dragging
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
          const currX = startX + (endX - startX) * (i / steps);
          const currY = startY + (endY - startY) * (i / steps);
          await page.mouse.move(currX, currY);
          await new Promise(r => setTimeout(r, 50));
        }
        await page.mouse.up();
        console.log('Drag-and-drop completed. Waiting 5 seconds...');
        await new Promise(r => setTimeout(r, 5000));

        // Take screenshot
        const screenshotPath = path.resolve(__dirname, '../public/flow_after_drag.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Drag screenshot saved to ${screenshotPath}`);

        // Check if there are any new cards/nodes on the canvas
        const canvasNodes = await page.evaluate(() => {
          // Find any text or elements inside the canvas area that could represent cards/nodes
          // Typically these would be absolute positioned divs or elements with transform: translate
          const els = Array.from(document.querySelectorAll('div'));
          return els.filter(el => {
            const style = window.getComputedStyle(el);
            return (style.position === 'absolute' || style.transform.includes('matrix')) &&
                   el.textContent && el.textContent.trim().length > 0 && el.textContent.trim().length < 100;
          }).map(el => el.textContent.trim()).slice(0, 30);
        });
        console.log('Potential canvas nodes/text:', canvasNodes);
      } else {
        console.log('Could not get bounding box for image');
      }
    } else {
      console.log('No uploaded image found to drag');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

run();
