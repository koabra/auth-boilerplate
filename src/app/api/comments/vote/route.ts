import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const voteSchema = z.object({
  commentId: z.string(),
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

export const POST = withAuth(async ({ req, session }) => {
  const canRead = await hasPermission(session.userId, "comments", "read");
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = voteSchema.parse(await req.json());
  const existing = await prisma.comment.findUnique({
    where: { id: payload.commentId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  if (payload.value === 0) {
    await prisma.commentVote.deleteMany({
      where: {
        commentId: payload.commentId,
        userId: session.userId,
      },
    });
  } else {
    await prisma.commentVote.upsert({
      where: {
        userId_commentId: {
          userId: session.userId,
          commentId: payload.commentId,
        },
      },
      update: { value: payload.value },
      create: {
        userId: session.userId,
        commentId: payload.commentId,
        value: payload.value,
      },
    });
  }

  await writeAuditLog({
    request: req,
    userId: session.userId,
    action: "comment.voted",
    resourceType: "comment",
    resourceId: payload.commentId,
    metadata: { value: payload.value },
  });

  return NextResponse.json({ ok: true });
});
