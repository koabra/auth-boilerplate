import { prisma } from "@/lib/prisma";

export async function isFeatureEnabled(key: string) {
  const flag = await prisma.featureFlag.findUnique({ where: { key } });
  return Boolean(flag?.isEnabled);
}
