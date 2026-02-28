import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserRolesAndPermissions } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const patchSchema = z.object({
  pseudonym: z
    .string()
    .min(3, "Pseudonym must be at least 3 characters")
    .max(24, "Pseudonym must be at most 24 characters")
    .regex(/^[A-Za-z0-9_]+$/, "Pseudonym can contain letters, numbers, and underscores only (no spaces).")
    .transform((value) => value.trim()),
  realName: z.string().max(120).optional().nullable(),
});

export const GET = withPermission("profile", "manage", async ({ session }) => {
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { linkedAccounts: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const { roles } = await getUserRolesAndPermissions(user.id);
  return NextResponse.json({
    profile: {
      id: user.id,
      email: user.email,
      pseudonym: user.pseudonym,
      realName: user.realName,
      roles,
      linkedProviders: user.linkedAccounts.map((account) => account.provider),
      emailVerified: user.emailVerified,
    },
  });
});

export const PATCH = withPermission("profile", "manage", async ({ req, session }) => {
  try {
    const payload = patchSchema.parse(await req.json());
    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        pseudonym: payload.pseudonym,
        realName: payload.realName ?? null,
      },
    });

    await writeAuditLog({
      request: req,
      userId: session.userId,
      action: "profile.updated",
      resourceType: "user",
      resourceId: updated.id,
      metadata: {
        pseudonym: payload.pseudonym,
        realName: payload.realName ?? null,
      },
    });

    return NextResponse.json({
      profile: {
        id: updated.id,
        email: updated.email,
        pseudonym: updated.pseudonym,
        realName: updated.realName,
        emailVerified: updated.emailVerified,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid profile input" }, { status: 400 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This pseudonym is already taken." }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Could not update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
