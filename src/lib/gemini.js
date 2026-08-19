import { GoogleGenAI } from "@google/genai";

/* Gemini 3.7 Flash with Google Search grounding built in.
   The SDK talks straight to the Gemini API from the browser using
   the key the player enters — nothing is proxied or stored remotely. */

export const GEMINI_MODEL = "gemini-3.7-flash";

const API_KEY_STORAGE = "sidequest_gemini_api_key";

export function loadApiKey() {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

export function saveApiKey(key) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    /* private mode — key lives only in memory for this session */
  }
}

/* Pull a JSON object out of a model reply that may carry markdown
   fences or prose around it. */
function extractJson(text) {
  const cleaned = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("No JSON object in model reply");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function groundingSources(response) {
  const meta = response?.candidates?.[0]?.groundingMetadata;
  if (!meta) return [];
  return (meta.groundingChunks || [])
    .map((c) => c.web)
    .filter(Boolean)
    .map((w) => ({ title: w.title || w.uri, uri: w.uri }));
}

export class GeminiError extends Error {
  constructor(message, { badKey = false } = {}) {
    super(message);
    this.badKey = badKey;
  }
}

/**
 * One grounded JSON call. Returns { data, sources }.
 * Gemini 3 supports structured JSON output alongside the googleSearch
 * tool; if a given key/tier rejects the combination we retry with the
 * tool only and parse the JSON out of the free-form reply.
 */
export async function callGemini(apiKey, prompt, attempt = 0) {
  const ai = new GoogleGenAI({ apiKey });
  try {
    let response;
    try {
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });
    } catch (err) {
      if (isBadKey(err)) throw err;
      // Some configurations reject search + JSON mode together.
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] },
      });
    }
    return { data: extractJson(response.text), sources: groundingSources(response) };
  } catch (err) {
    if (isBadKey(err)) {
      throw new GeminiError(
        "Gemini rejected the API key. Check it in AI Studio and re-enter it.",
        { badKey: true }
      );
    }
    if (attempt < 1) return callGemini(apiKey, prompt, attempt + 1);
    throw new GeminiError(err?.message || "The Gemini API call failed.");
  }
}

function isBadKey(err) {
  const msg = String(err?.message || err || "");
  return (
    err?.status === 400 && /api key/i.test(msg) ||
    /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg) ||
    err?.status === 401 || err?.status === 403
  );
}
