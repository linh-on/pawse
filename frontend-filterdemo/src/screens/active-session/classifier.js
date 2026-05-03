import MODEL from "../../../model.json";

/**
 * JS port of the trained TF-IDF + Logistic Regression classifier.
 * Reads vocabulary, idf, coef, intercept, and ngram_range from model.json.
 */
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

/**
 * Builds a flat lowercase keyword list from trusted_contacts rows.
 * Each contact has a name + optional comma-separated note.
 *
 * e.g. [{ name: "Mom", note: "mama, home" }]
 *   → ["mom", "mama", "home"]
 */
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

/**
 * Main classify function — checks trusted contacts FIRST, then falls back to ML.
 *
 * @param {string}   text            — notification text
 * @param {string[]} trustedKeywords — from buildTrustedKeywords()
 * @returns {"urgent" | "non_urgent"}
 */
export function classifyWithContacts(text, trustedKeywords = []) {
  const lower = text.toLowerCase();

  // Trusted contact match → always urgent, bypass ML entirely
  const isTrusted = trustedKeywords.some((kw) => lower.includes(kw));
  if (isTrusted) return "urgent";

  // Fall back to TF-IDF model
  return tfidfClassify(text);
}
