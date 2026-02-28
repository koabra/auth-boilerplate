import { NextResponse } from "next/server";
import { withPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = withPermission("analytics", "read", async () => {
  const [visits, uniqueVisitors, topPagesRaw, topClicksRaw, timeRows] = await Promise.all([
    prisma.analyticsEvent.count({ where: { eventType: "page_view" } }),
    prisma.analyticsSession.count(),
    prisma.analyticsEvent.groupBy({
      by: ["pageUrl"],
      _count: { pageUrl: true },
      orderBy: { _count: { pageUrl: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["elementId"],
      _count: { elementId: true },
      where: {
        eventType: "click",
        elementId: { not: null },
      },
      orderBy: { _count: { elementId: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.findMany({
      where: {
        eventType: "page_view",
        durationMs: { not: null },
      },
      select: { durationMs: true },
    }),
  ]);

  const avgTimeOnPageMs =
    timeRows.length === 0
      ? 0
      : Math.round(
          timeRows.reduce((acc, row) => acc + (row.durationMs ?? 0), 0) / timeRows.length,
        );

  return NextResponse.json({
    visits,
    uniqueVisitors,
    topPages: topPagesRaw.map((row) => ({
      pageUrl: row.pageUrl,
      count: row._count.pageUrl,
    })),
    topClicks: topClicksRaw.map((row) => ({
      elementId: row.elementId ?? "unknown",
      count: row._count.elementId,
    })),
    avgTimeOnPageMs,
  });
});
