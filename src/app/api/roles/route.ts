import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

export const GET = withPermission("roles", "read", async () => {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  return NextResponse.json({
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map(
        (entry) => `${entry.permission.resource}:${entry.permission.action}`,
      ),
    })),
  });
});

const postSchema = z.object({
  name: z.string().min(2).regex(/^[a-z0-9_]+$/),
  displayName: z.string().min(2),
});

export const POST = withPermission("roles", "manage", async ({ req, session }) => {
  const payload = postSchema.parse(await req.json());
  const role = await prisma.role.create({
    data: {
      name: payload.name,
      displayName: payload.displayName,
      isSystem: false,
    },
  });

  await writeAuditLog({
    request: req,
    userId: session.userId,
    action: "role.created",
    resourceType: "role",
    resourceId: role.id,
    metadata: payload,
  });

  return NextResponse.json({ role });
});

const patchSchema = z.object({
  roleId: z.string(),
  permissionIds: z.array(z.string()),
});

export const PATCH = withPermission("roles", "manage", async ({ req, session }) => {
  const payload = patchSchema.parse(await req.json());

  await prisma.rolePermission.deleteMany({ where: { roleId: payload.roleId } });
  await prisma.rolePermission.createMany({
    data: payload.permissionIds.map((permissionId) => ({
      roleId: payload.roleId,
      permissionId,
    })),
    skipDuplicates: true,
  });

  await writeAuditLog({
    request: req,
    userId: session.userId,
    action: "role.permissions.updated",
    resourceType: "role",
    resourceId: payload.roleId,
    metadata: { permissionIds: payload.permissionIds },
  });

  return NextResponse.json({ ok: true });
});
