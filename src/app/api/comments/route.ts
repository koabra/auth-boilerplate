import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { writeAuditLog } from "@/lib/audit";

export const GET = withAuth(async ({ req }) => {
  const enabled = await isFeatureEnabled("comments_enabled");
  if (!enabled) {
    return NextResponse.json({ error: "Comments are disabled" }, { status: 403 });
  }

  const entityType = req.nextUrl.searchParams.get("entityType");
  const entityId = req.nextUrl.searchParams.get("entityId");
  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { entityType, entityId },
    include: {
      user: {
        select: { email: true, displayName: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
});

const postSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  parentId: z.string().optional(),
  content: z.string().min(1),
});

export const POST = withAuth(async ({ req, session }) => {
  const enabled = await isFeatureEnabled("comments_enabled");
  if (!enabled) {
    return NextResponse.json({ error: "Comments are disabled" }, { status: 403 });
  }

  const canCreate = await hasPermission(session.userId, "comments", "create");
  if (!canCreate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = postSchema.parse(await req.json());
  const comment = await prisma.comment.create({
    data: {
      userId: session.userId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      parentId: payload.parentId,
      content: payload.content,
    },
  });

  await writeAuditLog({
    request: req,
    userId: session.userId,
    action: "comment.created",
    resourceType: "comment",
    resourceId: comment.id,
  });

  return NextResponse.json({ comment });
});

const patchSchema = z.object({
  commentId: z.string(),
  content: z.string().min(1),
});

export const PATCH = withAuth(async ({ req, session }) => {
  const payload = patchSchema.parse(await req.json());
  const existing = await prisma.comment.findUnique({ where: { id: payload.commentId } });
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const canManage = await hasPermission(session.userId, "comments", "manage");
  if (!canManage && existing.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const comment = await prisma.comment.update({
    where: { id: payload.commentId },
    data: { content: payload.content },
  });

  await writeAuditLog({
    request: req,
    userId: session.userId,
    action: "comment.updated",
    resourceType: "comment",
    resourceId: comment.id,
  });

  return NextResponse.json({ comment });
});

const deleteSchema = z.object({
  commentId: z.string(),
});

export const DELETE = withAuth(async ({ req, session }) => {
  const payload = deleteSchema.parse(await req.json());
  const existing = await prisma.comment.findUnique({ where: { id: payload.commentId } });
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const canManage = await hasPermission(session.userId, "comments", "manage");
  if (!canManage && existing.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.comment.update({
    where: { id: payload.commentId },
    data: { deletedAt: new Date(), content: "[deleted]" },
  });

  await writeAuditLog({
    request: req,
    userId: session.userId,
    action: "comment.deleted",
    resourceType: "comment",
    resourceId: payload.commentId,
  });

  return NextResponse.json({ ok: true });
});
