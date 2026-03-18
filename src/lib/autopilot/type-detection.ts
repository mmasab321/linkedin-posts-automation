/**
 * Auto-detect post type from topic text for autopilot.
 */

const PROJECT_WORDS = ["built", "shipped", "launched", "made", "built", "released"];
const INSIGHT_WORDS = ["why", "how", "what", "truth", "real", "actually"];
const RESULTS_INDICATORS = /\d+%|\d+x|\$\d+|before.?after|metric|revenue|saved|growth/;

export type PostType = "story" | "insight" | "project" | "tip" | "hot_take" | "results";

export function detectPostTypeFromTopic(topic: string): PostType {
  const t = topic.toLowerCase();

  for (const w of PROJECT_WORDS) {
    if (t.includes(w)) return "project";
  }
  for (const w of INSIGHT_WORDS) {
    if (t.includes(w)) return "insight";
  }
  if (RESULTS_INDICATORS.test(t)) return "results";

  return "tip";
}

/**
 * Override for diversity: if last N posts were mostly one type, force a different type.
 * Also avoids penalised types (e.g. high rejection rate from feedback).
 */
export function applyDiversityOverride(
  detected: PostType,
  recentTypes: PostType[],
  lastN = 2,
  penalisedTypes: PostType[] = []
): PostType {
  const alternatives: PostType[] = ["story", "project", "insight", "tip", "hot_take", "results"];
  const allowed = alternatives.filter((x) => !penalisedTypes.includes(x));
  let candidate = detected;
  if (penalisedTypes.includes(detected) && allowed.length > 0) {
    candidate = allowed[0];
  }
  if (recentTypes.length < lastN) return candidate;
  const recent = recentTypes.slice(-lastN);
  const allSame = recent.every((x) => x === recent[0]);
  if (!allSame) return candidate;
  const other = alternatives.filter((x) => x !== recent[0] && !penalisedTypes.includes(x));
  if (other.length) return other[0] ?? candidate;
  return candidate;
}
