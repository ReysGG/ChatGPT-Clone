import fs from "fs";
import path from "path";

export interface CookieItem {
  name: string;
  value: string;
  domain: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string | null;
  expires?: number;
  expirationDate?: number;
  hostOnly?: boolean;
  session?: boolean;
  storeId?: string | null;
}

/**
 * Puppeteer-compatible cookie format.
 */
export interface PuppeteerCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  expires?: number;
}

const DEFAULT_COOKIES_PATH = path.resolve(
  process.cwd(),
  process.env.GOOGLE_COOKIES_PATH || "./cookies/google-cookies.json"
);

/**
 * Load Google cookies from a JSON file and convert them to Puppeteer format.
 *
 * Supports cookies exported by:
 * - Cookie-Editor extension (JSON array)
 * - EditThisCookie extension (JSON array with `expirationDate`)
 * - Chrome DevTools manual copy
 */
export function loadGoogleCookies(
  cookiesPath: string = DEFAULT_COOKIES_PATH
): PuppeteerCookie[] {
  if (!fs.existsSync(cookiesPath)) {
    throw new Error(
      `Cookie file tidak ditemukan: ${cookiesPath}\n` +
        "Silakan export cookies Google Anda ke file tersebut.\n" +
        "Lihat cookies/README.md untuk panduan."
    );
  }

  const raw = fs.readFileSync(cookiesPath, "utf-8");
  let cookies: CookieItem[];

  try {
    cookies = JSON.parse(raw);
  } catch {
    throw new Error(
      `Format cookie file tidak valid (bukan JSON): ${cookiesPath}`
    );
  }

  if (!Array.isArray(cookies)) {
    throw new Error(
      `Cookie file harus berupa JSON array, tetapi mendapat ${typeof cookies}`
    );
  }

  if (cookies.length === 0) {
    throw new Error("Cookie file kosong — tidak ada cookies yang dimuat.");
  }

  return cookies.map(normalizeCookie);
}

function normalizeCookie(cookie: CookieItem): PuppeteerCookie {
  // `expirationDate` is used by EditThisCookie; `expires` is the Puppeteer field.
  const expires =
    cookie.expires ?? cookie.expirationDate ?? undefined;

  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path || "/",
    httpOnly: cookie.httpOnly ?? false,
    secure: cookie.secure ?? true,
    sameSite: normalizeSameSite(cookie.sameSite),
    ...(expires !== undefined && expires > 0 ? { expires } : {}),
  };
}

function normalizeSameSite(
  sameSite?: string | null
): "Strict" | "Lax" | "None" | undefined {
  if (!sameSite) return undefined;
  const lower = sameSite.toLowerCase();
  if (lower === "strict") return "Strict";
  if (lower === "lax") return "Lax";
  if (lower === "none" || lower === "no_restriction") return "None";
  return undefined;
}
