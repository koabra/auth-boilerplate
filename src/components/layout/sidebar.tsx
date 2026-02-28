"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

const links = [
  { href: "/dashboard", label: "Dashboard", roles: ["user", "admin", "super_user"] },
  { href: "/dashboard/comments", label: "Comments", roles: ["user", "admin", "super_user"] },
  { href: "/dashboard/admin/users", label: "Users", roles: ["admin", "super_user"] },
  { href: "/dashboard/admin/roles", label: "Roles", roles: ["super_user"] },
  { href: "/dashboard/admin/analytics", label: "Analytics", roles: ["admin", "super_user"] },
  { href: "/dashboard/admin/settings", label: "Settings", roles: ["super_user"] },
  { href: "/dashboard/admin/audit-logs", label: "Audit Logs", roles: ["admin", "super_user"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <aside className="h-screen w-64 border-r border-zinc-200 p-4 dark:border-zinc-800">
      <p className="mb-4 text-sm font-semibold uppercase text-zinc-500">Auth Boilerplate</p>
      <nav className="space-y-1">
        {links
          .filter((link) => link.roles.some((role) => user.roles.includes(role)))
          .map((link) => (
            <Link
              className={cn(
                "block rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                pathname === link.href && "bg-zinc-100 dark:bg-zinc-800",
              )}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
      </nav>
    </aside>
  );
}
