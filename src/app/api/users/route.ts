import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const GET = withPermission("users", "read", async () => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
      roles: user.userRoles.map((userRole) => userRole.role.name),
    })),
  });
});

const patchSchema = z.object({
  userId: z.string(),
  isActive: z.boolean().optional(),
  roleName: z.string().optional(),
});

export const PATCH = withPermission("users", "update", async ({ req, session }) => {
  const payload = patchSchema.parse(await req.json());

  if (typeof payload.isActive === "boolean") {
    await prisma.user.update({
      where: { id: payload.userId },
      data: { isActive: payload.isActive },
    });
  }

  if (payload.roleName) {
    const role = await prisma.role.findUnique({ where: { name: payload.roleName } });
    if (role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: payload.userId,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: payload.userId,
          roleId: role.id,
          assignedBy: session.userId,
        },
      });
    }
  }

  await writeAuditLog({
    request: req,
    userId: session.userId,
    action: "user.updated",
    resourceType: "user",
    resourceId: payload.userId,
    metadata: payload,
  });

  return NextResponse.json({ ok: true });
});
