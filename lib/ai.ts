import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Default model for MVP: prefer the lighter free-tier model to reduce quota failures.
export const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

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
