"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

type LinkPolicy = {
  href: string;
  label: string;
  roles?: string[];
  permission?: {
    resource: string;
    action: string;
  };
};

const links: LinkPolicy[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["user", "admin", "super_user"] },
  { href: "/dashboard/profile", label: "Profile", permission: { resource: "profile", action: "manage" } },
  { href: "/dashboard/comments", label: "Comments", permission: { resource: "comments", action: "read" } },
  { href: "/dashboard/billing", label: "Billing", permission: { resource: "billing", action: "read" } },
  { href: "/dashboard/role-a", label: "Role A Demo", permission: { resource: "examples", action: "view_a" } },
  { href: "/dashboard/role-b", label: "Role B Demo", permission: { resource: "examples", action: "view_b" } },
  { href: "/dashboard/admin/users", label: "Users", permission: { resource: "users", action: "read" } },
  { href: "/dashboard/admin/roles", label: "Roles", permission: { resource: "roles", action: "manage" } },
  { href: "/dashboard/admin/analytics", label: "Analytics", permission: { resource: "analytics", action: "read" } },
  { href: "/dashboard/admin/settings", label: "Settings", permission: { resource: "settings", action: "manage" } },
  { href: "/dashboard/admin/audit-logs", label: "Audit Logs", permission: { resource: "audit_logs", action: "read" } },
];

type SidebarProps = {
  mobileOpen: boolean;
  onNavigate?: () => void;
};

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasRole, hasPermission } = useAuth();
  if (!user) return null;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onNavigate}
      />
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-72 border-r border-[var(--border)] bg-[var(--panel)] p-4 text-[var(--panel-foreground)] transition-transform md:sticky md:w-64 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Auth Boilerplate
        </p>
        <nav className="space-y-1">
          {links
            .filter((link) => {
              if (link.permission) {
                return hasPermission(link.permission.resource, link.permission.action);
              }
              if (link.roles?.length) {
                return link.roles.some((role) => hasRole(role));
              }
              return true;
            })
            .map((link) => (
              <Link
                className={cn(
                  "block rounded-md px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
                  pathname === link.href &&
                    "bg-[var(--accent)] font-medium text-[var(--accent-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]",
                )}
                href={link.href}
                key={link.href}
                onClick={onNavigate}
                data-track={`nav.${link.label.toLowerCase().replaceAll(" ", "_")}`}
              >
                {link.label}
              </Link>
            ))}
        </nav>
      </aside>
    </>
  );
}
