const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1440,900'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
    page.on('pageerror', err => console.error(`BROWSER ERROR: ${err.message}`));
    
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

    // 1. Upload the reference image
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('File input not found');
    }
    const testImagePath = path.resolve(__dirname, '../image.png');
    console.log(`Uploading reference image: ${testImagePath}`);
    await fileInput.uploadFile(testImagePath);

    console.log('Waiting 8 seconds for upload...');
    await new Promise(r => setTimeout(r, 8000));

    // 2. Open "Uploads" tab
    console.log('Opening Uploads tab...');
    let uploadsBtn = null;
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Uploads')) {
        uploadsBtn = btn;
        break;
      }
    }
    if (!uploadsBtn) {
      throw new Error('Uploads tab button not found');
    }
    await uploadsBtn.click();
    await new Promise(r => setTimeout(r, 2000));

    // 3. Find the uploaded image and drag it to canvas
    const imgs = await page.$$('img');
    let targetImg = null;
    for (const img of imgs) {
      const src = await page.evaluate(el => el.src, img);
      if (src && !src.includes('googleusercontent.com')) {
        targetImg = img;
        break;
      }
    }

    if (!targetImg) {
      throw new Error('Uploaded image not found in Uploads tab');
    }

    const box = await targetImg.boundingBox();
    if (!box) {
      throw new Error('Could not get bounding box of uploaded image');
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = 800;
    const endY = 450;

    console.log(`Dragging reference image from (${startX}, ${startY}) to (${endX}, ${endY})...`);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const currX = startX + (endX - startX) * (i / steps);
      const currY = startY + (endY - startY) * (i / steps);
      await page.mouse.move(currX, currY);
      await new Promise(r => setTimeout(r, 50));
    }
    await page.mouse.up();
    console.log('Drag-and-drop complete. Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));

    // 4. Change aspect ratio (e.g. to 1:1)
    console.log('Changing aspect ratio to 1:1...');
    // Click settings trigger
    let triggerBtn = null;
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Nano Banana') || text.includes('crop_'))) {
        triggerBtn = btn;
        break;
      }
    }

    if (!triggerBtn) {
      triggerBtn = await page.$('.ldbhld');
    }

    if (triggerBtn) {
      await triggerBtn.click();
      await new Promise(r => setTimeout(r, 1500));

      // Click the 1:1 aspect ratio button
      const ratioButtons = await page.$$('button');
      let ratioBtn = null;
      for (const btn of ratioButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('1:1')) {
          ratioBtn = btn;
          break;
        }
      }

      if (ratioBtn) {
        await ratioBtn.click();
        console.log('Successfully clicked 1:1 aspect ratio button.');
      } else {
        console.warn('1:1 aspect ratio button not found.');
      }
      
      // Close the settings popover by clicking the trigger again
      await triggerBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.warn('Settings trigger button not found.');
    }

    // 5. Input prompt
    console.log('Inputting prompt...');
    const promptInput = await page.$('[contenteditable="true"]');
    if (!promptInput) {
      throw new Error('Prompt input not found');
    }
    await promptInput.click();
    // Clear prompt if any
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    // Type prompt
    const promptText = "a cute robot holding a banana, vibrant color, 3d render";
    await promptInput.type(promptText, { delay: 30 });

    // 6. Click Create/Submit
    console.log('Clicking Create/Submit button...');
    let submitBtn = null;
    const buttonsAfterPrompt = await page.$$('button');
    for (const btn of buttonsAfterPrompt) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Create') && text.includes('arrow_forward')) {
        submitBtn = btn;
        break;
      }
    }

    if (!submitBtn) {
      // Fallback: press Enter
      await page.keyboard.press('Enter');
      console.log('Submit button not found, pressed Enter.');
    } else {
      await submitBtn.click();
      console.log('Clicked Create button.');
    }

    // 7. Wait for image generation
    console.log('Waiting for generated image to appear...');
    const startTime = Date.now();
    const timeoutMs = 90000;
    let imageUrl = null;

    // Capture initial image sources to detect new ones
    const initialImages = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img"))
        .map((img) => img.src)
        .filter((src) => src && !src.startsWith("data:image/svg"))
    );
    const initialSet = new Set(initialImages);

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 3000));

      const currentImages = await page.evaluate(() =>
        Array.from(document.querySelectorAll("img"))
          .map((img) => ({
            src: img.src,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
          }))
          .filter(
            (img) =>
              img.src &&
              !img.src.startsWith("data:image/svg") &&
              img.width > 200 && // Filter out small thumbnails
              img.height > 200
          )
      );

      const newImages = currentImages.filter((img) => !initialSet.has(img.src));
      if (newImages.length > 0) {
        newImages.sort((a, b) => b.width * b.height - a.width * a.height);
        imageUrl = newImages[0].src;
        break;
      }

      console.log(`Still waiting... (${Math.round((Date.now() - startTime) / 1000)}s passed)`);
    }

    if (imageUrl) {
      console.log(`Generated image URL: ${imageUrl}`);
      // Download
      const imageBuffer = await page.evaluate(async (url) => {
        const resp = await fetch(url);
        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();
        return Array.from(new Uint8Array(arrayBuffer));
      }, imageUrl);

      const fileName = `generated-test-${Date.now()}.png`;
      const filePath = path.resolve(__dirname, `../public/generated-images/${fileName}`);
      fs.writeFileSync(filePath, Buffer.from(imageBuffer));
      console.log(`Saved generated image to ${filePath}`);
    } else {
      console.error('Timeout: image was not generated.');
      const debugScreenshotPath = path.resolve(__dirname, '../public/flow_gen_timeout.png');
      await page.screenshot({ path: debugScreenshotPath });
      console.log(`Debug screenshot saved to ${debugScreenshotPath}`);
    }

  } catch (error) {
    console.error('Error in complete generation test:', error);
  } finally {
    await browser.close();
  }
}

run();
