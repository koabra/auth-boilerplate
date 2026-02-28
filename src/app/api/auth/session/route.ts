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

const AUTH_PROVIDER = "firebase";

function toBasePseudonym(raw: string) {
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return normalized || "user";
}

function randomPseudonymSeed() {
  return `user_${Math.random().toString(36).slice(2, 10)}`;
}

async function getUniquePseudonym(raw: string) {
  const base = toBasePseudonym(raw);
  const existing = await prisma.user.findUnique({
    where: { pseudonym: base },
    select: { id: true },
  });
  if (!existing) return base;
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = `${base}_${Math.floor(1000 + Math.random() * 9000)}`;
    const taken = await prisma.user.findUnique({
      where: { pseudonym: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}_${Date.now().toString().slice(-6)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const decoded = await getFirebaseAdminAuth().verifyIdToken(body.idToken);
    const provider = decoded.firebase?.sign_in_provider ?? "unknown";
    const email = decoded.email ?? `${decoded.uid}@unknown.local`;
    const emailVerified = Boolean(decoded.email_verified);

    const existingLink = await prisma.linkedAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: AUTH_PROVIDER,
          providerUserId: decoded.uid,
        },
      },
      include: { user: true },
    });
    let user = existingLink?.user ?? null;

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email,
          emailVerified,
          pseudonym: await getUniquePseudonym(decoded.name?.trim() || randomPseudonymSeed()),
          realName: decoded.name ?? null,
          displayName: decoded.name ?? null,
          avatarUrl: decoded.picture ?? null,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firebaseUid: decoded.uid,
          email,
          emailVerified,
          realName: user.realName ?? decoded.name ?? null,
          displayName: decoded.name ?? user.displayName,
          avatarUrl: decoded.picture ?? user.avatarUrl,
        },
      });
    }

    await prisma.linkedAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: AUTH_PROVIDER,
          providerUserId: decoded.uid,
        },
      },
      update: {
        userId: user.id,
        email,
      },
      create: {
        userId: user.id,
        provider: AUTH_PROVIDER,
        providerUserId: decoded.uid,
        email,
      },
    });

    if (provider === "password" && !emailVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          error: "Your account has been disabled. Please contact support.",
          code: "ACCOUNT_DISABLED",
        },
        { status: 403 },
      );
    }

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
