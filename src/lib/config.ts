import { prisma } from "@/lib/prisma";

export type ConfigKey = "GETLATE_API_KEY" | "MOONSHOT_API_KEY" | "LINKEDIN_ACCOUNT_ID";

export async function getConfig(key: ConfigKey): Promise<string | null> {
  const row = await prisma.config.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setConfig(key: ConfigKey, value: string): Promise<void> {
  await prisma.config.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

