import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookies } from "@/lib/session";
import { isFeatureEnabled } from "@/lib/feature-flags";

const eventSchema = z.object({
  eventType: z.enum(["page_view", "click", "custom", "heartbeat"]),
  pageUrl: z.string(),
  elementId: z.string().optional(),
  elementText: z.string().optional(),
  durationMs: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  sessionToken: z.string().min(10),
  events: z.array(eventSchema).min(1),
});

export async function POST(req: NextRequest) {
  const enabled = await isFeatureEnabled("analytics_enabled");
  if (!enabled) {
    return NextResponse.json({ ok: true });
  }

  const payload = bodySchema.parse(await req.json());
  const session = await getSessionFromCookies();
  const requestIp = req.headers.get("x-forwarded-for");

  const analyticsSession = await prisma.analyticsSession.upsert({
    where: { sessionToken: payload.sessionToken },
    update: {
      endedAt: new Date(),
      ipAddress: requestIp,
      userAgent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
      userId: session?.userId ?? null,
    },
    create: {
      sessionToken: payload.sessionToken,
      ipAddress: requestIp,
      userAgent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
      userId: session?.userId ?? null,
    },
  });

  await prisma.analyticsEvent.createMany({
    data: payload.events.map((event) => ({
      sessionId: analyticsSession.id,
      eventType: event.eventType,
      pageUrl: event.pageUrl,
      elementId: event.elementId ?? null,
      elementText: event.elementText ?? null,
      metadata: (event.metadata ?? {}) as Prisma.InputJsonValue,
      durationMs: event.durationMs ?? null,
    })),
  });

  return NextResponse.json({ ok: true });
}
