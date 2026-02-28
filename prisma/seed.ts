import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissionTuples = [
  ["users", "create"],
  ["users", "read"],
  ["users", "update"],
  ["users", "delete"],
  ["users", "manage"],
  ["roles", "create"],
  ["roles", "read"],
  ["roles", "update"],
  ["roles", "delete"],
  ["roles", "manage"],
  ["permissions", "manage"],
  ["comments", "create"],
  ["comments", "read"],
  ["comments", "update"],
  ["comments", "delete"],
  ["comments", "manage"],
  ["analytics", "read"],
  ["analytics", "manage"],
  ["settings", "read"],
  ["settings", "manage"],
  ["audit_logs", "read"],
  ["profile", "manage"],
  ["examples", "view_a"],
  ["examples", "view_b"],
] as const;

async function main() {
  const superRole = await prisma.role.upsert({
    where: { name: "super_user" },
    update: {},
    create: {
      name: "super_user",
      displayName: "Super User",
      description: "Full access role",
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: {
      name: "admin",
      displayName: "Admin",
      description: "Admin role",
      isSystem: true,
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: {
      name: "user",
      displayName: "User",
      description: "Default user role",
      isSystem: true,
    },
  });

  const permissions = await Promise.all(
    permissionTuples.map(([resource, action]) =>
      prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: {
          resource,
          action,
          description: `${resource}:${action}`,
        },
      }),
    ),
  );

  const map = new Map(permissions.map((p) => [`${p.resource}:${p.action}`, p.id]));

  const grant = async (roleId: string, keys: string[]) => {
    await Promise.all(
      keys.map(async (key) => {
        const permissionId = map.get(key);
        if (!permissionId) return;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId } },
          update: {},
          create: { roleId, permissionId },
        });
      }),
    );
  };

  await grant(
    superRole.id,
    permissions.map((p) => `${p.resource}:${p.action}`),
  );

  await grant(adminRole.id, [
    "users:read",
    "users:update",
    "comments:manage",
    "analytics:read",
    "audit_logs:read",
    "settings:read",
    "examples:view_b",
  ]);

  await grant(userRole.id, ["comments:create", "comments:read", "profile:manage", "examples:view_a"]);

  await prisma.featureFlag.upsert({
    where: { key: "comments_enabled" },
    update: {},
    create: { key: "comments_enabled", description: "Enable comments", isEnabled: true },
  });

  await prisma.featureFlag.upsert({
    where: { key: "analytics_enabled" },
    update: {},
    create: { key: "analytics_enabled", description: "Enable analytics", isEnabled: true },
  });

  const superEmail = process.env.SUPER_USER_EMAIL;
  if (superEmail) {
    const user = await prisma.user.findUnique({ where: { email: superEmail } });
    if (user) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: superRole.id } },
        update: {},
        create: { userId: user.id, roleId: superRole.id },
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
