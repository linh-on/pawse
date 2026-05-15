import MODEL from "../../../model.json";

const API_URL = "https://nolmonone-pawse-classifier.hf.space/classify";
const TIMEOUT_MS = 3000;

// If model says non_urgent but confidence is below this → treat as urgent
const NON_URGENT_CONFIDENCE_THRESHOLD = 0.85;

// ─── Local TF-IDF classifier (offline fallback) ───────────────────────────────

export function tfidfClassify(text) {
  const { vocabulary, idf, coef, intercept, ngram_range } = MODEL;
  const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];
  const ngrams = [];

  for (let n = ngram_range[0]; n <= ngram_range[1]; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(" "));
    }
  }

  const tf = {};
  ngrams.forEach((ng) => {
    if (vocabulary[ng] !== undefined) {
      tf[vocabulary[ng]] = (tf[vocabulary[ng]] || 0) + 1;
    }
  });

  let score = intercept;
  Object.entries(tf).forEach(([idx, count]) => {
    const i = parseInt(idx);
    score += count * idf[i] * coef[i];
  });

  return score > 0 ? "urgent" : "non_urgent";
}

// ─── MobileBERT API call ──────────────────────────────────────────────────────

async function classifyWithAPI(text) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return data; // { label, confidence }
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── Trusted contact helpers ──────────────────────────────────────────────────

export function buildTrustedKeywords(contacts = []) {
  return contacts.flatMap((c) => {
    const base = [c.name.trim().toLowerCase()];
    const extras = c.note
      ? c.note
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean)
      : [];
    return [...base, ...extras];
  });
}

// ─── Main classify (async) ────────────────────────────────────────────────────
// 1. Trusted contact match → always urgent, skip ML
// 2. Try MobileBERT API
//    - If non_urgent but confidence < threshold → treat as urgent
// 3. If API fails (offline/timeout) → fall back to TF-IDF

export async function classifyWithContacts(text, trustedKeywords = []) {
  const lower = text.toLowerCase();

  // Trusted contact → always urgent
  const isTrusted = trustedKeywords.some((kw) => lower.includes(kw));
  if (isTrusted) return "urgent";

  // Try MobileBERT API
  try {
    const { label, confidence } = await classifyWithAPI(text);

    // Not confident enough that it's safe → treat as urgent
    if (
      label === "non_urgent" &&
      confidence < NON_URGENT_CONFIDENCE_THRESHOLD
    ) {
      console.log(
        `[classifier] MobileBERT unsure (${(confidence * 100).toFixed(1)}%) → urgent`,
      );
      return "urgent";
    }

    console.log(
      `[classifier] MobileBERT → ${label} (${(confidence * 100).toFixed(1)}%)`,
    );
    return label;
  } catch (err) {
    // Offline or server down → fall back to TF-IDF
    console.log(`[classifier] TF-IDF fallback (${err.message})`);
    return tfidfClassify(text);
  }
}