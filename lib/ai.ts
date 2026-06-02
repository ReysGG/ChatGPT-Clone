import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Default model per planning doc: Gemini 2.5 Flash
export const DEFAULT_MODEL = "gemini-2.5-flash";

// Lazy singleton — building the app must not require the key to be present.
let _genAI: GoogleGenerativeAI | null = null;

export function getGenAI(): GoogleGenerativeAI {
  if (_genAI) return _genAI;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to .env (server-side only).");
  }
  _genAI = new GoogleGenerativeAI(apiKey);
  return _genAI;
}

export function getModel(modelName: string = DEFAULT_MODEL) {
  return getGenAI().getGenerativeModel({ model: modelName });
}
