import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { loadGoogleCookies } from "./cookies-loader";

const FLOW_URL = "https://labs.google/fx/tools/flow";
const GENERATED_DIR = path.resolve(
  process.cwd(),
  process.env.GENERATED_IMAGES_DIR || "./public/generated-images"
);

// Ensure target directory exists
if (!fs.existsSync(GENERATED_DIR)) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

export type ImageGenProgress =
  | { stage: "connecting"; message: string }
  | { stage: "navigating"; message: string }
  | { stage: "inputting"; message: string }
  | { stage: "generating"; message: string }
  | { stage: "downloading"; message: string }
  | { stage: "done"; message: string; imagePath: string; fileName: string }
  | { stage: "error"; message: string };

export type ProgressCallback = (progress: ImageGenProgress) => void;

/**
 * Generate an image using Google Flow via Puppeteer automation.
 *
 * Flow:
 * 1. Launch headless Chrome with stealth plugin
 * 2. Load Google cookies for authentication
 * 3. Navigate to Google Flow
 * 4. Input the user's prompt
 * 5. Wait for image generation to complete
 * 6. Download the generated image
 * 7. Save to public/generated-images/
 */
export async function generateImageViaFlow(
  prompt: string,
  onProgress?: ProgressCallback
): Promise<{ imagePath: string; fileName: string }> {
  // Dynamic import to avoid bundling Puppeteer in client-side code
  const puppeteer = await import("puppeteer");

  const progress = (p: ImageGenProgress) => onProgress?.(p);

  progress({ stage: "connecting", message: "Memulai browser..." });

  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });

  try {
    const page = await browser.newPage();

    // Set a realistic viewport & user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // Load and set cookies
    progress({ stage: "connecting", message: "Memuat cookies Google..." });
    const cookies = loadGoogleCookies();
    await page.setCookie(...cookies);

    // Navigate to Google Flow
    progress({ stage: "navigating", message: "Membuka Google Flow..." });
    await page.goto(FLOW_URL, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a bit for page to fully render (SPA)
    await sleep(3000);

    // Check if we're redirected to login (cookies might be expired)
    const currentUrl = page.url();
    if (
      currentUrl.includes("accounts.google.com") ||
      currentUrl.includes("/signin")
    ) {
      throw new Error(
        "Cookies Google sudah expired. Silakan export ulang cookies dari browser.\n" +
          "Lihat cookies/README.md untuk panduan."
      );
    }

    // Input the prompt
    progress({ stage: "inputting", message: "Menginput prompt..." });

    // Google Flow typically has a textarea or input for prompts.
    // We try multiple selectors to be resilient to UI changes.
    const promptSelectors = [
      'textarea[aria-label*="prompt" i]',
      'textarea[placeholder*="describe" i]',
      'textarea[placeholder*="prompt" i]',
      "textarea",
      'input[type="text"][aria-label*="prompt" i]',
      '[contenteditable="true"]',
      'div[role="textbox"]',
    ];

    let promptInput = null;
    for (const selector of promptSelectors) {
      promptInput = await page.$(selector);
      if (promptInput) break;
    }

    if (!promptInput) {
      // Take a screenshot for debugging
      const debugPath = path.join(GENERATED_DIR, `debug-${Date.now()}.png`);
      await page.screenshot({ path: debugPath, fullPage: true });
      throw new Error(
        "Tidak bisa menemukan input prompt di Google Flow. " +
          `Screenshot debug disimpan di: ${debugPath}`
      );
    }

    // Clear existing text and type the prompt
    await promptInput.click();
    // Select all existing text with keyboard shortcut
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await promptInput.type(prompt, { delay: 30 }); // type with human-like delay

    // Find and click the generate/submit button
    const submitSelectors = [
      'button[aria-label*="generate" i]',
      'button[aria-label*="create" i]',
      'button[aria-label*="submit" i]',
      'button[type="submit"]',
      'button:has(svg)', // icon button
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      const buttons = await page.$$(selector);
      for (const btn of buttons) {
        const isVisible = await btn.evaluate(
          (el) =>
            (el as HTMLElement).offsetParent !== null &&
            getComputedStyle(el).visibility !== "hidden"
        );
        if (isVisible) {
          submitButton = btn;
          break;
        }
      }
      if (submitButton) break;
    }

    if (!submitButton) {
      // Try pressing Enter as fallback
      await page.keyboard.press("Enter");
    } else {
      await submitButton.click();
    }

    // Wait for image generation
    progress({
      stage: "generating",
      message: "Menunggu gambar digenerate... (bisa 30-120 detik)",
    });

    // Poll for new image elements appearing on the page.
    // Google Flow usually renders the result as an <img> inside a specific container.
    const imageUrl = await waitForGeneratedImage(page, 120000);

    if (!imageUrl) {
      const debugPath = path.join(GENERATED_DIR, `debug-noresult-${Date.now()}.png`);
      await page.screenshot({ path: debugPath, fullPage: true });
      throw new Error(
        "Timeout: gambar tidak muncul setelah 2 menit. " +
          `Screenshot debug: ${debugPath}`
      );
    }

    // Download the image
    progress({ stage: "downloading", message: "Mendownload gambar..." });

    const fileName = `flow-${Date.now()}-${randomUUID().slice(0, 8)}.png`;
    const filePath = path.join(GENERATED_DIR, fileName);

    // Download the image using the page context (to keep cookies/auth)
    const imageBuffer = await page.evaluate(async (url: string) => {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const arrayBuffer = await blob.arrayBuffer();
      return Array.from(new Uint8Array(arrayBuffer));
    }, imageUrl);

    fs.writeFileSync(filePath, Buffer.from(imageBuffer));

    const imagePath = `/generated-images/${fileName}`;

    progress({
      stage: "done",
      message: "Gambar berhasil digenerate!",
      imagePath,
      fileName,
    });

    return { imagePath, fileName };
  } finally {
    await browser.close();
  }
}

/**
 * Wait for a generated image to appear on the page.
 * Polls the DOM every 3 seconds for new <img> elements with substantial src.
 */
async function waitForGeneratedImage(
  page: import("puppeteer").Page,
  timeoutMs: number
): Promise<string | null> {
  const startTime = Date.now();

  // Capture initial image sources to detect new ones
  const initialImages = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .map((img) => img.src)
      .filter((src) => src && !src.startsWith("data:image/svg"))
  );

  const initialSet = new Set(initialImages);

  while (Date.now() - startTime < timeoutMs) {
    await sleep(3000);

    // Check for new images
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
            img.width > 100 &&
            img.height > 100
        )
    );

    // Find new images that weren't there before
    const newImages = currentImages.filter((img) => !initialSet.has(img.src));

    if (newImages.length > 0) {
      // Return the largest new image (most likely the generated one)
      newImages.sort((a, b) => b.width * b.height - a.width * a.height);
      return newImages[0].src;
    }

    // Also check for canvas elements (some generators render to canvas)
    const canvasDataUrl = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll("canvas"));
      const largeCanvas = canvases.find(
        (c) => c.width > 200 && c.height > 200
      );
      return largeCanvas?.toDataURL("image/png") ?? null;
    });

    if (canvasDataUrl) {
      return canvasDataUrl;
    }

    // Check for download buttons appearing (alternate detection)
    const hasDownloadBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      return buttons.some(
        (btn) =>
          btn.textContent?.toLowerCase().includes("download") ||
          btn.getAttribute("aria-label")?.toLowerCase().includes("download")
      );
    });

    if (hasDownloadBtn) {
      // Wait a moment more for the image to be fully ready
      await sleep(2000);
      // Re-check images
      const finalImages = await page.evaluate(() =>
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
              img.width > 100
          )
      );
      const newFinal = finalImages.filter((img) => !initialSet.has(img.src));
      if (newFinal.length > 0) {
        newFinal.sort((a, b) => b.width * b.height - a.width * a.height);
        return newFinal[0].src;
      }
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
