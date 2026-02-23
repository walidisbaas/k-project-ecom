import OpenAI from "openai";

let _openrouter: OpenAI | null = null;

/**
 * OpenRouter client (lazy singleton via Proxy).
 * Uses the OpenAI SDK with OpenRouter's base URL.
 */
export const openrouter: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    if (!_openrouter) {
      _openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY!,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://kenso.ai",
          "X-Title": "Kenso AI",
        },
      });
    }
    return Reflect.get(_openrouter, prop, receiver);
  },
});

export const PREVIEW_MODEL = "google/gemini-2.5-flash-lite-preview-09-2025";
export const PREVIEW_CHAT_MODEL = "openai/gpt-4.1";
