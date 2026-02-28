import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getUserRolesAndPermissions } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roles, permissions } = await getUserRolesAndPermissions(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles,
      permissions,
    },
  });
}
