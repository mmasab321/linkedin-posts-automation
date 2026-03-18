import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";

const DEFAULT_PROMPT_PATH = path.join(process.cwd(), "linkedin-post-generator.md");

async function readDefaultPrompt(): Promise<string> {
  return readFile(DEFAULT_PROMPT_PATH, "utf8");
}

/**
 * Returns the system prompt for the user. If UserPrompt exists, use it; else read
 * linkedin-post-generator.md, create a UserPrompt for this user, and return it.
 * Injects voice profile block at the top if VoiceProfile is complete.
 */
export async function getSystemPrompt(userId: string): Promise<string> {
  let prompt = await prisma.userPrompt.findUnique({
    where: { userId },
    select: { systemPrompt: true },
  });

  if (!prompt) {
    const defaultContent = await readDefaultPrompt();
    await prisma.userPrompt.create({
      data: { userId, systemPrompt: defaultContent },
    });
    prompt = { systemPrompt: defaultContent };
  }

  const voice = await prisma.voiceProfile.findUnique({
    where: { userId },
  });

  if (
    voice &&
    [voice.name, voice.headline, voice.niche, voice.audience, voice.tone].every((s) => s?.trim())
  ) {
    const block = [
      "## Author profile",
      `Name: ${voice.name.trim()}`,
      `Headline: ${voice.headline.trim()}`,
      `Niche: ${voice.niche.trim()}`,
      `Audience: ${voice.audience.trim()}`,
      `Tone: ${voice.tone.trim()}`,
      `Never use: ${(voice.avoidPhrases || "").trim()}`,
    ].join("\n");
    return block + "\n\n---\n\n" + prompt.systemPrompt;
  }

  return prompt.systemPrompt;
}

/** Read default prompt from file (for Reset to default). */
export async function getDefaultSystemPrompt(): Promise<string> {
  return readDefaultPrompt();
}
