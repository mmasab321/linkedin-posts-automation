/**
 * Autopilot quality gate: score 0-100, must pass checks to auto-approve.
 */

import type OpenAI from "openai";

export interface LLMQualityScore {
  score: number;          // 0–100 composite (sum of five 0–20 dimensions)
  hookQuality: number;    // first 2 lines: scroll-stopping, concrete, no "In today's"
  originality: number;    // personal angle, not generic advice
  valueClarity: number;   // single clear takeaway by the end
  toneMatch: number;      // matches declared tone in voice profile
  naturalness: number;    // sounds human, not templated
  feedback: string;       // one-sentence LLM rationale
}

/**
 * Run a second Moonshot call that scores the generated post across 5 quality
 * dimensions. Returns null on any failure so callers can fall back to the
 * mechanical score from validateContent().
 */
export async function llmQualityCheck(
  client: OpenAI,
  content: string,
  voiceProfile: { tone?: string | null; niche?: string | null } | null,
): Promise<LLMQualityScore | null> {
  try {
    const toneHint = voiceProfile?.tone?.trim() ? `Declared tone: ${voiceProfile.tone.trim()}.` : "";
    const nicheHint = voiceProfile?.niche?.trim() ? `Author niche: ${voiceProfile.niche.trim()}.` : "";

    const systemPrompt = `You are a LinkedIn post quality reviewer. ${toneHint} ${nicheHint}
Score the post on exactly these five dimensions (each 0–20, integers only):
- hookQuality: Is the very first line scroll-stopping and concrete? Deduct for "In today's", "I want to talk about", vague openers, or questions without stakes.
- originality: Does it share a personal perspective or concrete experience? Deduct for generic advice that could apply to anyone.
- valueClarity: Is there one clear, actionable takeaway by the end? Deduct if the reader wouldn't know what to do or think differently.
- toneMatch: Does the writing style match the declared tone? If no tone declared, score 15 by default.
- naturalness: Does it sound like a real person wrote it, not an AI template? Deduct for bullet-point overload, formulaic structure, or hollow enthusiasm.

Reply with ONLY valid JSON, no markdown, no explanation outside the JSON:
{"hookQuality":N,"originality":N,"valueClarity":N,"toneMatch":N,"naturalness":N,"feedback":"one sentence"}`;

    const res = await client.chat.completions.create({
      model: "moonshot-v1-8k",
      temperature: 0,
      max_tokens: 200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content.slice(0, 2000) },
      ],
    });

    const raw = res.choices[0]?.message?.content?.trim() ?? "";
    // Strip possible markdown fences
    const jsonStr = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(jsonStr) as Partial<LLMQualityScore>;

    const hookQuality = clamp(Number(parsed.hookQuality ?? 10), 0, 20);
    const originality = clamp(Number(parsed.originality ?? 10), 0, 20);
    const valueClarity = clamp(Number(parsed.valueClarity ?? 10), 0, 20);
    const toneMatch = clamp(Number(parsed.toneMatch ?? 15), 0, 20);
    const naturalness = clamp(Number(parsed.naturalness ?? 10), 0, 20);
    const score = hookQuality + originality + valueClarity + toneMatch + naturalness;

    return {
      score,
      hookQuality,
      originality,
      valueClarity,
      toneMatch,
      naturalness,
      feedback: typeof parsed.feedback === "string" ? parsed.feedback.slice(0, 300) : "",
    };
  } catch {
    return null;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, isNaN(n) ? min : n));
}

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
