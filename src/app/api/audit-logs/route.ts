import { NextResponse } from "next/server";
import { withPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = withPermission("audit_logs", "read", async () => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ logs });
});
