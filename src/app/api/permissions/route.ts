import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/auth";

export const GET = withPermission("permissions", "manage", async () => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: "asc" }, { action: "asc" }],
  });
  return NextResponse.json({ permissions });
});
