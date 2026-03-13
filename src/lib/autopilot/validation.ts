/**
 * Autopilot quality gate: score 0-100, must pass checks to auto-approve.
 */

const BANNED_PHRASES = [
  "In today's",
  "As an AI",
  "synergy",
  "leverage",
  "disruptive",
  "fast-paced",
];

export interface ValidationResult {
  score: number;
  passed: boolean;
  reasons: string[];
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function lastThreeLines(text: string): string {
  const lines = text.trim().split(/\n/).filter(Boolean);
  return lines.slice(-3).join(" ");
}

function firstFiveWords(text: string): string {
  return text.trim().split(/\s+/).slice(0, 5).join(" ").toLowerCase();
}

function lastFiveWords(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(-5).join(" ").toLowerCase();
}

/** Simple Jaccard-like similarity: shared words / total unique words. */
export function textSimilarity(a: string, b: string): number {
  const toSet = (s: string) =>
    new Set(s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean));
  const setA = toSet(a);
  const setB = toSet(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function validateContent(
  content: string,
  recentPostContents: string[],
  options: { minScoreToApprove: number } = { minScoreToApprove: 85 }
): ValidationResult {
  const reasons: string[] = [];
  let score = 100;
  const text = content.trim();

  // Word count 150-350
  const wc = wordCount(text);
  if (wc < 150) {
    score -= 25;
    reasons.push(`Too short (${wc} words, min 150)`);
  } else if (wc > 350) {
    score -= 15;
    reasons.push(`Too long (${wc} words, max 350)`);
  }

  // CTA: "?" in last 3 lines
  const last3 = lastThreeLines(text);
  if (!last3.includes("?")) {
    score -= 20;
    reasons.push("No question/CTA in last 3 lines");
  }

  // Personal voice: "I" or "My"
  if (!/\b(I|My)\b/i.test(text)) {
    score -= 15;
    reasons.push("Missing personal voice (I/My)");
  }

  // Banned phrases
  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      score -= 30;
      reasons.push(`Banned phrase: "${phrase}"`);
      break;
    }
  }

  // No repeated start/end (first 5 words vs last 5 words)
  const first5 = firstFiveWords(text);
  const last5 = lastFiveWords(text);
  if (first5 && last5 && first5 === last5) {
    score -= 25;
    reasons.push("Opening and closing too similar");
  }

  // Similarity to recent posts
  for (const recent of recentPostContents) {
    const sim = textSimilarity(text, recent);
    if (sim >= 0.7) {
      score -= 40;
      reasons.push(`Too similar to a recent post (${Math.round(sim * 100)}%)`);
      break;
    }
  }

  score = Math.max(0, Math.min(100, score));
  const passed = score >= options.minScoreToApprove;

  return { score, passed, reasons };
}
