import { NextResponse } from "next/server";
import { withPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = withPermission("audit_logs", "read", async ({ req }) => {
  const search = req.nextUrl.searchParams.get("q") ?? "";
  const action = req.nextUrl.searchParams.get("action") ?? "";
  const resourceType = req.nextUrl.searchParams.get("resourceType") ?? "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "50"), 200);
  const cursor = req.nextUrl.searchParams.get("cursor");

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: "insensitive" } },
              { resourceType: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  const hasMore = logs.length > limit;
  const trimmed = hasMore ? logs.slice(0, limit) : logs;
  return NextResponse.json({
    logs: trimmed,
    nextCursor: hasMore ? trimmed[trimmed.length - 1]?.id : null,
  });
});
