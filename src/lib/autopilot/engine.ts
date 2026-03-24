import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getApprovalEmailTo, sendApprovalEmail } from "@/lib/email";
import { getConfig } from "@/lib/config";
import { createMoonshotClient } from "@/lib/moonshot";
import { getPlan } from "@/lib/plans";
import { getSystemPrompt } from "@/lib/prompt";
import { getNextAvailableSlot } from "@/lib/scheduling";
import { toPlainLinkedInText } from "@/lib/text";
import { textSimilarity, validateContent, llmQualityCheck } from "@/lib/autopilot/validation";
import { applyDiversityOverride, detectPostTypeFromTopic, type PostType } from "@/lib/autopilot/type-detection";

export type AutopilotRunResult =
  | { ok: true; action: "SCHEDULED" | "PENDING_REVIEW" | "PENDING_APPROVAL"; draftId: string; topic: string; score: number }
  | { ok: true; action: "SKIPPED"; reason: string }
  | { ok: false; action: "FAILED"; reason: string; disableAutopilot?: boolean };

export async function getOrCreateAutopilotConfig(userId: string) {
  let config = await prisma.autopilotConfig.findUnique({ where: { userId } });
  if (!config) {
    config = await prisma.autopilotConfig.create({
      data: {
        userId,
        enabled: false,
        scheduleTime: "09:00",
        maxAutoPerMonth: 10,
        validationRules: {},
      },
    });
  }
  return config;
}

/** Pick next topic: TopicPool PENDING by priorityBoost DESC, createdAt ASC; or from evergreen. */
export async function pickNextTopic(userId: string): Promise<{ topic: string; topicId: string; sourceId: string } | null> {
  const topic = await prisma.topicPool.findFirst({
    where: { status: "PENDING", source: { userId } },
    orderBy: [{ priorityBoost: "desc" }, { createdAt: "asc" }],
    include: { source: true },
  });
  if (topic) return { topic: topic.title, topicId: topic.id, sourceId: topic.sourceId };

  const evergreen = await prisma.contentSource.findMany({
    where: { userId, type: "EVERGREEN", isActive: true },
    orderBy: { priority: "desc" },
    take: 20,
  });
  for (const src of evergreen) {
    const titles = (src.title || "").split("\n").map((t) => t.trim()).filter(Boolean);
    for (const title of titles) {
      if (title.length < 10) continue;
      const existing = await prisma.topicPool.findFirst({
        where: { sourceId: src.id, title: { equals: title, mode: "insensitive" } },
      });
      if (existing) continue;
      const created = await prisma.topicPool.create({
        data: { sourceId: src.id, title, status: "PENDING" },
      });
      return { topic: created.title, topicId: created.id, sourceId: src.id };
    }
  }
  return null;
}

async function getRecentPostTypes(userId: string, limit: number): Promise<PostType[]> {
  const drafts = await prisma.postDraft.findMany({
    where: { userId, status: { in: ["SCHEDULED", "PUBLISHED"] }, isAutopilot: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { postType: true },
  });
  return drafts.map((d) => d.postType as PostType);
}

/** Post types with rejection rate >= 60% (rejected+discarded / total) in last 20 autopilot with feedback. */
async function getPenalisedPostTypes(userId: string): Promise<PostType[]> {
  const drafts = await prisma.postDraft.findMany({
    where: { userId, isAutopilot: true, manualFeedback: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { postType: true, manualFeedback: true },
  });
  const byType = new Map<string, { approved: number; rejected: number }>();
  for (const d of drafts) {
    const t = d.postType ?? "tip";
    if (!byType.has(t)) byType.set(t, { approved: 0, rejected: 0 });
    const cur = byType.get(t)!;
    if (d.manualFeedback === "approved") cur.approved++;
    else cur.rejected++;
  }
  const penalised: PostType[] = [];
  for (const [type, counts] of byType) {
    const total = counts.approved + counts.rejected;
    if (total > 0 && counts.rejected / total >= 0.6) penalised.push(type as PostType);
  }
  return penalised;
}

type Brief = { angle: string; hook: string; key_point: string };

async function generateBrief(client: ReturnType<typeof createMoonshotClient>, topic: string): Promise<Brief | null> {
  const systemPrompt =
    "You are a content strategist. Given a topic, return a JSON object with three fields: angle (a specific contrarian or personal take on the topic, 1 sentence), hook (a scroll-stopping first line, under 12 words, no 'I'), and key_point (the single most valuable takeaway, 1 sentence). Return only valid JSON.";
  try {
    const completion = await client.chat.completions.create({
      model: "kimi-k2.5",
      temperature: 1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: topic },
      ],
    });
    const raw = completion.choices?.[0]?.message?.content?.trim() ?? "";
    const json = JSON.parse(raw) as unknown;
    if (json && typeof json === "object" && "key_point" in json && typeof (json as Brief).key_point === "string") {
      const b = json as Brief;
      return {
        angle: typeof b.angle === "string" ? b.angle : "",
        hook: typeof b.hook === "string" ? b.hook : "",
        key_point: b.key_point,
      };
    }
  } catch {
    // fall back to current behaviour
  }
  return null;
}

/** Find best matching experience by tag overlap (case-insensitive substring in topic). */
async function findBestExperience(userId: string, topic: string): Promise<{ title: string; description: string } | null> {
  const entries = await prisma.experienceEntry.findMany({
    where: { userId },
    select: { id: true, title: true, description: true, tags: true },
  });
  const topicLower = topic.toLowerCase();
  let best: { title: string; description: string; score: number } | null = null;
  for (const e of entries) {
    const tags = e.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    let score = 0;
    for (const tag of tags) {
      if (tag.length < 2) continue;
      if (topicLower.includes(tag)) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { title: e.title, description: e.description, score };
    }
  }
  return best ? { title: best.title, description: best.description } : null;
}

async function getRecentContents(userId: string, limit: number): Promise<string[]> {
  const drafts = await prisma.postDraft.findMany({
    where: { userId, status: { in: ["SCHEDULED", "PUBLISHED"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { content: true },
  });
  return drafts.map((d) => d.content);
}

/**
 * Returns up to 3 recently approved + 2 recently rejected autopilot post
 * content strings for few-shot injection. Returns null if there aren't
 * enough approved posts to provide a meaningful signal (< 3).
 */
async function getFeedbackExamples(userId: string): Promise<{ approved: string[]; rejected: string[] } | null> {
  const approved = await prisma.postDraft.findMany({
    where: { userId, isAutopilot: true, manualFeedback: "approved" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { content: true },
  });
  if (approved.length < 3) return null;
  const rejected = await prisma.postDraft.findMany({
    where: { userId, isAutopilot: true, manualFeedback: { in: ["rejected", "discarded"] } },
    orderBy: { createdAt: "desc" },
    take: 2,
    select: { content: true },
  });
  return {
    approved: approved.slice(0, 3).map((d) => d.content.slice(0, 800)),
    rejected: rejected.map((d) => d.content.slice(0, 800)),
  };
}

/**
 * Picks the post type that is most behind its configured pillar target
 * (based on last N posts). Returns detectedType unchanged when no pillar
 * is sufficiently lagging (> 5% deficit) or the type is penalised.
 */
function pickTypeByPillarTarget(
  pillars: Record<string, number>,
  recentTypes: PostType[],
  detectedType: PostType,
  penalisedTypes: PostType[],
): PostType {
  const total = Object.values(pillars).reduce((a, b) => a + b, 0);
  if (total === 0) return detectedType;
  const normalised: Record<string, number> = {};
  for (const [k, v] of Object.entries(pillars)) normalised[k] = v / total;

  const counts: Record<string, number> = {};
  for (const t of recentTypes) counts[t] = (counts[t] ?? 0) + 1;
  const n = recentTypes.length || 1;

  let bestType: PostType | null = null;
  let bestDeficit = 0.05; // minimum deficit threshold to trigger override
  for (const [type, target] of Object.entries(normalised)) {
    if (penalisedTypes.includes(type as PostType)) continue;
    const actual = (counts[type] ?? 0) / n;
    const deficit = target - actual;
    if (deficit > bestDeficit) {
      bestDeficit = deficit;
      bestType = type as PostType;
    }
  }
  return bestType ?? detectedType;
}

async function isTopicDuplicate(userId: string, topic: string, threshold = 0.8): Promise<boolean> {
  const recent = await prisma.topicPool.findMany({
    where: { status: "USED", source: { userId } },
    orderBy: { usedAt: "desc" },
    take: 30,
    select: { title: true },
  });
  for (const r of recent) {
    if (textSimilarity(topic, r.title) >= threshold) return true;
  }
  return false;
}

export async function runAutopilotOnce(userId: string): Promise<AutopilotRunResult> {
  const config = await getOrCreateAutopilotConfig(userId);
  if (!config.enabled) {
    return { ok: true, action: "SKIPPED", reason: "Autopilot disabled" };
  }

  const now = new Date();
  if (config.pausedUntil && now < config.pausedUntil) {
    return { ok: true, action: "SKIPPED", reason: "Autopilot paused" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const plan = getPlan(user?.plan ?? "free");

  const quota = await prisma.monthlyQuota.findFirst({
    where: { userId, year: now.getFullYear(), month: now.getMonth() },
  });
  const usedCount = quota?.usedCount ?? 0;
  const maxCount = quota?.maxCount ?? plan.monthlyPostLimit;
  if (usedCount >= maxCount) {
    await prisma.autopilotConfig.update({
      where: { id: config.id },
      data: { enabled: false },
    });
    return { ok: false, action: "FAILED", reason: `Monthly quota full (${maxCount}/${maxCount})`, disableAutopilot: true };
  }

  const rules = (config.validationRules as Record<string, unknown>) || {};
  const minScore = (rules.minScoreToApprove as number) ?? 85;
  const planMaxAuto = plan.maxAutoPerMonth;
  const maxAuto = Math.min(config.maxAutoPerMonth ?? planMaxAuto, planMaxAuto);
  const autopilotUsedThisMonth = await prisma.postDraft.count({
    where: {
      userId,
      isAutopilot: true,
      createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      status: { in: ["SCHEDULED", "PUBLISHED"] },
    },
  });
  if (autopilotUsedThisMonth >= maxAuto) {
    return { ok: true, action: "SKIPPED", reason: `Max auto posts this month (${maxAuto}) reached` };
  }

  const slot = await getNextAvailableSlot(userId, now);
  if (!slot) {
    return { ok: true, action: "SKIPPED", reason: "No available slot (quota or 48h)" };
  }

  const topicResult = await pickNextTopic(userId);
  if (!topicResult) {
    await prisma.autopilotLog.create({
      data: { userId, action: "SKIPPED", topic: "(none)", error: "No topics in pool" },
    });
    return { ok: true, action: "SKIPPED", reason: "No topics in pool" };
  }

  const { topic, topicId } = topicResult;
  if (await isTopicDuplicate(userId, topic)) {
    await prisma.topicPool.update({ where: { id: topicId }, data: { status: "DISCARDED" } });
    await prisma.autopilotLog.create({
      data: { userId, action: "SKIPPED", topic, error: "Duplicate topic" },
    });
    return { ok: true, action: "SKIPPED", reason: "Topic too similar to recent" };
  }

  const moonshotKey = await getConfig("MOONSHOT_API_KEY", userId);
  const getlateKey = await getConfig("GETLATE_API_KEY", userId);
  const linkedinAccountId = await getConfig("LINKEDIN_ACCOUNT_ID", userId);
  if (!moonshotKey) {
    await prisma.autopilotLog.create({ data: { userId, action: "FAILED", topic, error: "Moonshot API key not set" } });
    return { ok: false, action: "FAILED", reason: "Moonshot API key not set" };
  }
  if (!getlateKey || !linkedinAccountId) {
    await prisma.autopilotLog.create({ data: { userId, action: "FAILED", topic, error: "GetLate/LinkedIn not configured" } });
    return { ok: false, action: "FAILED", reason: "GetLate or LinkedIn Account ID not set" };
  }

  const client = createMoonshotClient(moonshotKey);

  // Step 1: Brief generation (only if plan allows)
  let brief: Brief | null = null;
  if (plan.briefGeneration) {
    try {
      brief = await generateBrief(client, topic);
    } catch {
      // fall back to current behaviour
    }
  }
  const keyPoint = brief?.key_point ?? topic;
  const hookSuggestion = brief?.hook ?? "";

  // Personal experience bank (only if plan allows)
  let personalContext: { title: string; description: string } | null = null;
  let feedbackExamples: { approved: string[]; rejected: string[] } | null = null;
  if (plan.experienceBank) {
    [personalContext, feedbackExamples] = await Promise.all([
      findBestExperience(userId, topic),
      getFeedbackExamples(userId),
    ]);
  }

  const penalisedTypes = await getPenalisedPostTypes(userId);
  const recentTypes = await getRecentPostTypes(userId, 5);
  let postType = detectPostTypeFromTopic(topic);

  // Content pillar bias: if user configured pillar targets, bias toward the most-behind type
  const configuredPillars = (rules.contentPillars as Record<string, number> | undefined) ?? {};
  if (Object.keys(configuredPillars).length > 0) {
    const recentTypes30 = await getRecentPostTypes(userId, 30);
    postType = pickTypeByPillarTarget(configuredPillars, recentTypes30, postType, penalisedTypes);
  }

  postType = applyDiversityOverride(postType, recentTypes, 2, penalisedTypes);

  let systemPrompt: string;
  try {
    systemPrompt = await getSystemPrompt(userId);
  } catch {
    await prisma.autopilotLog.create({ data: { userId, action: "FAILED", topic, error: "Missing prompt file" } });
    return { ok: false, action: "FAILED", reason: "Missing linkedin-post-generator.md" };
  }

  const userInputLines = [
    `POST_TYPE: ${postType}`,
    `TOPIC: ${topic}`,
    `KEY_POINT: ${keyPoint}`,
    `TONE_MODIFIER: `,
  ];
  if (hookSuggestion) userInputLines.unshift(`HOOK_SUGGESTION: ${hookSuggestion}`);
  if (personalContext) userInputLines.push(`PERSONAL_CONTEXT: ${personalContext.title} — ${personalContext.description}`);
  const baseUserInput = userInputLines.join("\n");

  // Feedback loop: prepend few-shot examples from past approved/rejected posts
  let userInput = baseUserInput;
  if (feedbackExamples && feedbackExamples.approved.length >= 3) {
    const approvedBlock = feedbackExamples.approved
      .map((p, i) => `[WORKED ${i + 1}]\n${p}`)
      .join("\n\n");
    const rejectedBlock =
      feedbackExamples.rejected.length > 0
        ? "\n\n" +
          feedbackExamples.rejected.map((p, i) => `[DIDN'T WORK ${i + 1}]\n${p}`).join("\n\n")
        : "";
    userInput =
      `Here are posts that worked well for this creator:\n${approvedBlock}` +
      rejectedBlock +
      `\n\n---\nNow generate a new post with these inputs:\n${baseUserInput}`;
  }

  let raw: string;
  try {
    const completion = await client.chat.completions.create({
      model: "kimi-k2.5",
      temperature: 1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
    });
    raw = completion.choices?.[0]?.message?.content ?? "";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Kimi error";
    await prisma.autopilotLog.create({ data: { userId, action: "FAILED", topic, error: msg } });
    return { ok: false, action: "FAILED", reason: msg };
  }

  const content = toPlainLinkedInText(raw);
  const recentContents = await getRecentContents(userId, 10);

  // Always run mechanical validation (hard-blocks like banned phrases + similarity)
  const mechanical = validateContent(content, recentContents, { minScoreToApprove: minScore });
  const hardBlocked = mechanical.reasons.some(
    (r) => r.startsWith("Banned") || r.startsWith("Too similar"),
  );

  // LLM quality check — gracefully falls back to mechanical score on any error
  const voiceForCheck = await prisma.voiceProfile.findUnique({
    where: { userId },
    select: { tone: true, niche: true },
  });
  const llmResult = await llmQualityCheck(client, content, voiceForCheck);

  let finalScore: number;
  let finalReasons: string[];
  if (llmResult !== null) {
    finalScore = hardBlocked ? Math.min(llmResult.score, 40) : llmResult.score;
    finalReasons = [
      ...(llmResult.feedback ? [llmResult.feedback] : []),
      ...mechanical.reasons.filter((r) => r.startsWith("Banned") || r.startsWith("Too similar")),
    ];
  } else {
    finalScore = mechanical.score;
    finalReasons = mechanical.reasons;
  }

  await prisma.autopilotLog.create({
    data: {
      userId,
      action: "VALIDATED",
      topic,
      validationScore: finalScore,
      error: finalReasons.length ? finalReasons.join("; ") : null,
    },
  });

  if (finalScore < 70) {
    await prisma.topicPool.update({ where: { id: topicId }, data: { status: "DISCARDED" } });
    const failures = (config.consecutiveFailures || 0) + 1;
    await prisma.autopilotConfig.update({
      where: { id: config.id },
      data: {
        consecutiveFailures: failures,
        ...(failures >= 3 ? { enabled: false } : {}),
      },
    });
    return {
      ok: false,
      action: "FAILED",
      reason: `Quality too low (${finalScore}): ${finalReasons.join(", ")}`,
      disableAutopilot: failures >= 3,
    };
  }

  const draft = await prisma.postDraft.create({
    data: {
      userId,
      status: "PENDING_REVIEW",
      content,
      topic,
      postType,
      keyPoint,
      isAutopilot: true,
    },
  });

  await prisma.topicPool.update({
    where: { id: topicId },
    data: { status: "USED", usedAt: now },
  });

  // Email approval flow: do not schedule with GetLate until user approves via email (safety gate)
  if (finalScore >= minScore) {
    const token = randomBytes(32).toString("hex");
    const approvalTo = await getApprovalEmailTo(userId);

    await prisma.postDraft.update({
      where: { id: draft.id },
      data: {
        approvalToken: token,
        approvalStatus: "pending",
        approvalSentAt: now,
        scheduledFor: slot,
      },
    });

    if (approvalTo) {
      const emailResult = await sendApprovalEmail({
        to: approvalTo,
        draftId: draft.id,
        token,
        content: draft.content,
        topic,
        scheduledFor: slot,
      });
      if (!emailResult.ok) {
        await prisma.autopilotLog.create({
          data: { userId, action: "FAILED", topic, draftId: draft.id, error: `Email: ${emailResult.error}` },
        });
      }
    } else {
      // No approval email configured — log a warning so this silent failure is visible
      await prisma.autopilotLog.create({
        data: {
          userId,
          action: "SKIPPED",
          topic,
          draftId: draft.id,
          error: "No approval email configured (set APPROVAL_EMAIL env var or add one in Settings)",
        },
      });
    }

    await prisma.autopilotLog.create({
      data: { userId, action: "VALIDATED", topic, draftId: draft.id, validationScore: finalScore },
    });
    await prisma.autopilotConfig.update({
      where: { id: config.id },
      data: { lastRunAt: now, consecutiveFailures: 0 },
    });

    return { ok: true, action: "PENDING_APPROVAL", draftId: draft.id, topic, score: finalScore };
  }

  return { ok: true, action: "PENDING_REVIEW", draftId: draft.id, topic, score: finalScore };
}
