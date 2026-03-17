import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { getApprovalEmailTo, sendApprovalEmail } from "@/lib/email";
import { getConfig } from "@/lib/config";
import { createMoonshotClient } from "@/lib/moonshot";
import { getNextAvailableSlot } from "@/lib/scheduling";
import { toPlainLinkedInText } from "@/lib/text";
import { textSimilarity, validateContent } from "@/lib/autopilot/validation";
import { applyDiversityOverride, detectPostTypeFromTopic, type PostType } from "@/lib/autopilot/type-detection";

export type AutopilotRunResult =
  | { ok: true; action: "SCHEDULED" | "PENDING_REVIEW" | "PENDING_APPROVAL"; draftId: string; topic: string; score: number }
  | { ok: true; action: "SKIPPED"; reason: string }
  | { ok: false; action: "FAILED"; reason: string; disableAutopilot?: boolean };

async function getSystemPrompt(): Promise<string> {
  const p = path.join(process.cwd(), "linkedin-post-generator.md");
  return readFile(p, "utf8");
}

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

async function getRecentContents(userId: string, limit: number): Promise<string[]> {
  const drafts = await prisma.postDraft.findMany({
    where: { userId, status: { in: ["SCHEDULED", "PUBLISHED"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { content: true },
  });
  return drafts.map((d) => d.content);
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

  const quota = await prisma.monthlyQuota.findFirst({
    where: { userId, year: now.getFullYear(), month: now.getMonth() },
  });
  const usedCount = quota?.usedCount ?? 0;
  const maxCount = quota?.maxCount ?? 20;
  if (usedCount >= maxCount) {
    await prisma.autopilotConfig.update({
      where: { id: config.id },
      data: { enabled: false },
    });
    return { ok: false, action: "FAILED", reason: `Monthly quota full (${maxCount}/${maxCount})`, disableAutopilot: true };
  }

  const rules = (config.validationRules as Record<string, unknown>) || {};
  const minScore = (rules.minScoreToApprove as number) ?? 85;
  const maxAuto = config.maxAutoPerMonth ?? 10;
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

  const recentTypes = await getRecentPostTypes(userId, 5);
  let postType = detectPostTypeFromTopic(topic);
  postType = applyDiversityOverride(postType, recentTypes, 2);

  let systemPrompt: string;
  try {
    systemPrompt = await getSystemPrompt();
  } catch {
    await prisma.autopilotLog.create({ data: { userId, action: "FAILED", topic, error: "Missing prompt file" } });
    return { ok: false, action: "FAILED", reason: "Missing linkedin-post-generator.md" };
  }

  const userInput = [
    `POST_TYPE: ${postType}`,
    `TOPIC: ${topic}`,
    `KEY_POINT: ${topic}`,
    `TONE_MODIFIER: `,
  ].join("\n");

  const client = createMoonshotClient(moonshotKey);
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
  const validation = validateContent(content, recentContents, { minScoreToApprove: minScore });

  await prisma.autopilotLog.create({
    data: {
      userId,
      action: "VALIDATED",
      topic,
      validationScore: validation.score,
      error: validation.reasons.length ? validation.reasons.join("; ") : null,
    },
  });

  if (validation.score < 70) {
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
      reason: `Quality too low (${validation.score}): ${validation.reasons.join(", ")}`,
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
      keyPoint: topic,
      isAutopilot: true,
    },
  });

  await prisma.topicPool.update({
    where: { id: topicId },
    data: { status: "USED", usedAt: now },
  });

  // Email approval flow: do not schedule with GetLate until user approves via email (safety gate)
  if (validation.score >= minScore) {
    const token = randomBytes(32).toString("hex");
    const approvalTo = getApprovalEmailTo();

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
    }

    await prisma.autopilotLog.create({
      data: { userId, action: "VALIDATED", topic, draftId: draft.id, validationScore: validation.score },
    });
    await prisma.autopilotConfig.update({
      where: { id: config.id },
      data: { lastRunAt: now, consecutiveFailures: 0 },
    });

    return { ok: true, action: "PENDING_APPROVAL", draftId: draft.id, topic, score: validation.score };
  }

  return { ok: true, action: "PENDING_REVIEW", draftId: draft.id, topic, score: validation.score };
}
