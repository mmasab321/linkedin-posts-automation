import { prisma } from "@/lib/prisma";

export type ConfigKey = "GETLATE_API_KEY" | "MOONSHOT_API_KEY" | "LINKEDIN_ACCOUNT_ID";

export async function getConfig(key: ConfigKey, userId: string): Promise<string | null> {
  const row = await prisma.config.findUnique({ where: { userId_key: { userId, key } } });
  return row?.value ?? null;
}

export async function setConfig(key: ConfigKey, value: string, userId: string): Promise<void> {
  await prisma.config.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value },
    update: { value },
  });
}

