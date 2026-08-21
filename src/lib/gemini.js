import { GoogleGenAI } from "@google/genai";

/* Gemini 3.7 Flash with Google Search grounding built in.
   The SDK talks straight to the Gemini API from the browser using
   the key the user enters — nothing is proxied or stored remotely. */

export const GEMINI_MODEL = "gemini-3.7-flash";

const API_KEY_STORAGE = "sidequest_gemini_api_key";
const SEARCH_STORAGE = "sidequest_use_search";

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

export function loadUseSearch() {
  try {
    return localStorage.getItem(SEARCH_STORAGE) !== "off";
  } catch {
    return true;
  }
}

export function saveUseSearch(on) {
  try {
    localStorage.setItem(SEARCH_STORAGE, on ? "on" : "off");
  } catch {
    /* ignore */
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
    if (start === -1 || end <= start) throw new Error("The model reply contained no JSON object");
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

/* The SDK's ApiError message is often a JSON blob like
   {"error":{"code":429,"message":"...","status":"RESOURCE_EXHAUSTED"}} —
   dig the human-readable part out of it. */
function apiMessage(err) {
  const raw = err?.message || String(err || "");
  try {
    const j = JSON.parse(raw);
    if (j?.error?.message) return j.error.message;
  } catch {
    /* not a JSON blob */
  }
  const m = raw.match(/"message"\s*:\s*"([^"]+)"/);
  return m ? m[1] : raw;
}

function isBadKey(err) {
  const msg = String(err?.message || err || "");
  return (
    /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg) ||
    err?.status === 401 ||
    err?.status === 403
  );
}

/* Not every key/tier accepts every config: some reject the googleSearch
   tool combined with JSON output mode, some reject search grounding
   entirely. Try the richest config first and degrade gracefully,
   remembering what worked so later calls don't repeat failed attempts. */
function buildConfigs(useSearch) {
  const configs = [];
  if (useSearch) {
    configs.push({ tools: [{ googleSearch: {} }], responseMimeType: "application/json" });
    configs.push({ tools: [{ googleSearch: {} }] });
  }
  configs.push({ responseMimeType: "application/json" });
  return configs;
}

let workingConfigKey = null;

/**
 * One JSON call, grounded via Google Search when enabled and permitted.
 * Returns { data, sources }. Throws GeminiError with the real API
 * message when every config fails.
 */
export async function callGemini(apiKey, prompt, { useSearch = true } = {}) {
  const ai = new GoogleGenAI({ apiKey });
  let configs = buildConfigs(useSearch);
  if (workingConfigKey) {
    configs = [
      ...configs.filter((c) => JSON.stringify(c) === workingConfigKey),
      ...configs.filter((c) => JSON.stringify(c) !== workingConfigKey),
    ];
  }

  let lastErr = null;
  for (const config of configs) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config,
      });
      const text = response.text;
      if (!text || !text.trim()) {
        const reason = response?.candidates?.[0]?.finishReason;
        throw new Error(`Empty reply from the model${reason ? ` (finish reason: ${reason})` : ""}`);
      }
      workingConfigKey = JSON.stringify(config);
      return { data: extractJson(text), sources: groundingSources(response) };
    } catch (err) {
      console.error("[SIDEQUEST] Gemini call failed with config", config, err);
      if (isBadKey(err)) {
        throw new GeminiError(apiMessage(err), { badKey: true });
      }
      lastErr = err;
    }
  }
  throw new GeminiError(apiMessage(lastErr));
}
