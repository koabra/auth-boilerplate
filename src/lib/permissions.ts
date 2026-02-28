import { prisma } from "@/lib/prisma";

export async function getUserRolesAndPermissions(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  const roles = userRoles.map((r) => r.role.name);
  const permissions = userRoles.flatMap((r) =>
    r.role.rolePermissions.map((rp) => ({
      resource: rp.permission.resource,
      action: rp.permission.action,
    })),
  );

  return { roles, permissions };
}

export async function hasPermission(userId: string, resource: string, action: string) {
  const { permissions, roles } = await getUserRolesAndPermissions(userId);
  if (roles.includes("super_user")) return true;
  return permissions.some(
    (permission) =>
      permission.resource === resource &&
      (permission.action === action || permission.action === "manage"),
  );
}

export async function requirePermission(userId: string, resource: string, action: string) {
  const allowed = await hasPermission(userId, resource, action);
  if (!allowed) {
    const error = new Error("Forbidden");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}
