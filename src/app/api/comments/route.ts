import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { writeAuditLog } from "@/lib/audit";

const MAX_COMMENT_DEPTH = 4;
type ParentCommentRef = {
  parentId: string | null;
  entityType: string;
  entityId: string;
};

export const GET = withAuth(async ({ req, session }) => {
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
        select: { email: true, displayName: true, pseudonym: true },
      },
      votes: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    comments: comments.map((comment) => ({
      ...comment,
      score: comment.votes.reduce((acc, vote) => acc + vote.value, 0),
      myVote: comment.votes.find((vote) => vote.userId === session.userId)?.value ?? 0,
    })),
  });
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
    return NextResponse.json({ error: "You do not have permission to post comments" }, { status: 403 });
  }

  const payload = postSchema.parse(await req.json());
  if (payload.parentId) {
    let parentDepth = 0;
    let currentParentId: string | null = payload.parentId;

    while (currentParentId) {
      const parent: ParentCommentRef | null = await prisma.comment.findUnique({
        where: { id: currentParentId },
        select: { parentId: true, entityType: true, entityId: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
      if (parent.entityType !== payload.entityType || parent.entityId !== payload.entityId) {
        return NextResponse.json({ error: "Parent comment does not belong to this thread" }, { status: 400 });
      }

      currentParentId = parent.parentId;
      parentDepth += 1;
    }

    if (parentDepth > MAX_COMMENT_DEPTH) {
      return NextResponse.json({ error: `Replies are limited to ${MAX_COMMENT_DEPTH} levels` }, { status: 400 });
    }
  }

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
