import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";
import { createSessionToken, getSessionCookieName, getSessionDurationSeconds } from "@/lib/session";
import { getUserRolesAndPermissions } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const bodySchema = z.object({
  idToken: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const decoded = await getFirebaseAdminAuth().verifyIdToken(body.idToken);

    const user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: {
        email: decoded.email ?? `${decoded.uid}@unknown.local`,
        displayName: decoded.name ?? null,
        avatarUrl: decoded.picture ?? null,
      },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? `${decoded.uid}@unknown.local`,
        displayName: decoded.name ?? null,
        avatarUrl: decoded.picture ?? null,
      },
    });

    const userRole = await prisma.role.findUnique({ where: { name: "user" } });
    if (userRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: userRole.id } },
        update: {},
        create: { userId: user.id, roleId: userRole.id },
      });
    }

    if (process.env.SUPER_USER_EMAIL && user.email === process.env.SUPER_USER_EMAIL) {
      const superRole = await prisma.role.findUnique({ where: { name: "super_user" } });
      if (superRole) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: superRole.id } },
          update: {},
          create: { userId: user.id, roleId: superRole.id },
        });
      }
    }

    const { roles } = await getUserRolesAndPermissions(user.id);
    const token = await createSessionToken({
      userId: user.id,
      firebaseUid: user.firebaseUid,
      email: user.email,
      roles,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: getSessionDurationSeconds(),
    });

    await writeAuditLog({
      request: req,
      userId: user.id,
      action: "auth.session.created",
      resourceType: "session",
      resourceId: user.id,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid authentication payload";
    const status = message.includes("Firebase admin env vars are missing") ? 500 : 400;
    console.error("Failed to create auth session", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  await writeAuditLog({
    request: req,
    action: "auth.session.deleted",
    resourceType: "session",
  });
  return response;
}
