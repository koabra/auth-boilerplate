import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { getUserRolesAndPermissions } from "@/lib/permissions";

export const GET = withPermission("users", "read", async ({ session }) => {
  const { roles: actorRoles } = await getUserRolesAndPermissions(session.userId);
  const isSuperUser = actorRoles.includes("super_user");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, displayName: true, isSystem: true },
  });
  const assignableRoles = isSuperUser ? roles : roles.filter((role) => role.name !== "super_user");

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      pseudonym: user.pseudonym,
      realName: user.realName,
      displayName: user.displayName,
      isActive: user.isActive,
      roles: user.userRoles.map((userRole) => userRole.role.name),
    })),
    assignableRoles,
  });
});

const patchSchema = z.object({
  userId: z.string(),
  isActive: z.boolean().optional(),
  roleNames: z.array(z.string()).optional(),
  sendPasswordReset: z.boolean().optional(),
});

async function sendFirebasePasswordResetEmail(email: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is required for reset email sending");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "PASSWORD_RESET",
        email,
      }),
    },
  );

  if (response.ok) return;

  type FirebaseErrorPayload = { error?: { message?: string } };
  let message = "Could not send Firebase password reset email";
  try {
    const payload = (await response.json()) as FirebaseErrorPayload;
    if (payload.error?.message) {
      message = payload.error.message;
    }
  } catch {
    // Keep fallback message.
  }

  throw new Error(message);
}

export const PATCH = withPermission("users", "update", async ({ req, session }) => {
  try {
    const payload = patchSchema.parse(await req.json());
    const { roles: actorRoles } = await getUserRolesAndPermissions(session.userId);
    const isSuperUser = actorRoles.includes("super_user");

    if (typeof payload.isActive === "boolean") {
      await prisma.user.update({
        where: { id: payload.userId },
        data: { isActive: payload.isActive },
      });
    }

    if (payload.roleNames) {
      const uniqueRoleNames = Array.from(
        new Set(payload.roleNames.map((roleName) => roleName.trim()).filter(Boolean)),
      );

      if (!uniqueRoleNames.includes("user")) {
        return NextResponse.json({ error: "The default 'user' role is required and cannot be removed." }, { status: 400 });
      }

      if (!isSuperUser && uniqueRoleNames.includes("super_user")) {
        return NextResponse.json({ error: "Only super_user can assign super_user role." }, { status: 403 });
      }

      const roles = await prisma.role.findMany({
        where: { name: { in: uniqueRoleNames } },
        select: { id: true, name: true },
      });
      const foundRoleNames = new Set(roles.map((role) => role.name));
      const unknownRoleNames = uniqueRoleNames.filter((roleName) => !foundRoleNames.has(roleName));
      if (unknownRoleNames.length) {
        return NextResponse.json(
          { error: `Unknown roles: ${unknownRoleNames.join(", ")}` },
          { status: 400 },
        );
      }

      await prisma.userRole.deleteMany({ where: { userId: payload.userId } });
      if (roles.length) {
        await prisma.userRole.createMany({
          data: roles.map((role) => ({
            userId: payload.userId,
            roleId: role.id,
            assignedBy: session.userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    let resetLink: string | null = null;
    let resetEmailSent = false;
    let resetEmailError: string | null = null;
    if (payload.sendPasswordReset) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true },
      });
      if (user?.email) {
        resetLink = await getFirebaseAdminAuth().generatePasswordResetLink(user.email);
        try {
          await sendFirebasePasswordResetEmail(user.email);
          resetEmailSent = true;
        } catch (emailError) {
          resetEmailError =
            emailError instanceof Error ? emailError.message : "Could not send Firebase password reset email";
        }
      }
    }

    await writeAuditLog({
      request: req,
      userId: session.userId,
      action: "user.updated",
      resourceType: "user",
      resourceId: payload.userId,
      metadata: payload,
    });

    return NextResponse.json({ ok: true, resetLink, resetEmailSent, resetEmailError });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid user update payload" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Could not update user";
    if (message.includes("OAuth2 access token") || message.includes("DECODER routines")) {
      return NextResponse.json(
        {
          error:
            "Password reset could not be generated because Firebase Admin credentials are invalid. Check FIREBASE_PRIVATE_KEY formatting.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
