import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const GET = withPermission("settings", "read", async () => {
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ flags });
});

const patchSchema = z.object({
  key: z.string(),
  isEnabled: z.boolean(),
});

export const PATCH = withPermission("settings", "manage", async ({ req, session }) => {
  const payload = patchSchema.parse(await req.json());
  const flag = await prisma.featureFlag.update({
    where: { key: payload.key },
    data: { isEnabled: payload.isEnabled },
  });

  await writeAuditLog({
    request: req,
    userId: session.userId,
    action: "feature_flag.updated",
    resourceType: "feature_flag",
    resourceId: flag.id,
    metadata: payload,
  });

  return NextResponse.json({ flag });
});
