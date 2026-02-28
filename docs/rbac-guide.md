# RBAC Implementation Guide

This document explains how role-based access and permission checks work in this project and how to implement the same pattern in other apps.

## Core Concepts

- `Role`: A named bundle of permissions (for example `user`, `admin`, `super_user`).
- `Permission`: A tuple in `resource:action` format (for example `users:read`).
- `UserRole`: Assignment table between users and roles.
- `RolePermission`: Assignment table between roles and permissions.

In this project, **permissions drive access** and **roles group permissions** for easier management.

## Data Model

The RBAC schema lives in `prisma/schema.prisma`:

- `Role`
- `Permission` (unique composite key: `[resource, action]`)
- `RolePermission`
- `UserRole`

Because permissions are normalized in the database, role updates can be done safely without changing application logic.

## Default Roles And Permissions

Seed data is defined in `prisma/seed.ts`.

### Permission Catalog

- `users:create`, `users:read`, `users:update`, `users:delete`, `users:manage`
- `roles:create`, `roles:read`, `roles:update`, `roles:delete`, `roles:manage`
- `permissions:manage`
- `comments:create`, `comments:read`, `comments:update`, `comments:delete`, `comments:manage`
- `analytics:read`, `analytics:manage`
- `settings:read`, `settings:manage`
- `audit_logs:read`
- `profile:manage`
- `examples:view_a`, `examples:view_b`

### Role Grants

- `super_user`: all permissions
- `admin`: `users:read`, `users:update`, `comments:manage`, `analytics:read`, `audit_logs:read`, `settings:read`, `examples:view_b`
- `user`: `comments:create`, `comments:read`, `profile:manage`, `examples:view_a`

## Runtime Authorization Flow

1. User signs in, session token is created with role names.
2. `GET /api/auth/me` loads current user + latest roles + permission tuples.
3. `AuthProvider` stores `user.roles` and `user.permissions`.
4. UI checks call `hasPermission(resource, action)` or `hasRole(role)`.
5. API checks use `withPermission(resource, action)` (authoritative server-side guard).

## UI Visibility vs Access Control

This project now uses a layered approach:

- **Sidebar visibility** (`src/components/layout/sidebar.tsx`): permission-aware link policy.
- **Page content guard** (`src/components/layout/permission-gate.tsx`): hides protected UI sections with fallback text.
- **API authorization** (`src/lib/auth.ts` + `src/lib/permissions.ts`): final enforcement.
- **Middleware** (`src/middleware.ts`): coarse gate (authenticated dashboard and admin prefix).

Important: middleware is not the final RBAC enforcement layer. API handlers with `withPermission` are.

## Super User/Admin Management UX

### Role Management

- UI: `src/components/admin/role-editor.tsx`
- APIs:
  - `GET /api/roles`
  - `GET /api/permissions`
  - `PATCH /api/roles` with `roleId` + `permissionIds`
- Behavior:
  - Roles are listed with active permissions.
  - Permissions can be toggled per role and saved.

### User Management

- UI: `src/components/admin/user-table.tsx`
- API: `GET /api/users`, `PATCH /api/users`
- Behavior:
  - Role assignment is checkbox-based from existing assignable roles.
  - No free-text role names.

### Assignment Safety Rules

Implemented in `src/app/api/users/route.ts`:

- Unknown role names return `400` instead of being silently ignored.
- Only actors with `super_user` role can assign `super_user`.
- `GET /api/users` returns `assignableRoles`, filtered for non-super users (no `super_user` option).


## How To Add RBAC To A New Feature

For a feature called `reports`:

1. Add permission tuples in seed:
   - `reports:read`
   - `reports:manage`
2. Grant those permissions to roles as needed.
3. Protect API routes with `withPermission("reports", "read")` or `withPermission("reports", "manage")`.
4. Protect page sections with `PermissionGate resource="reports" action="read"`.
5. Add sidebar entry with permission policy.
6. Add role-permission mapping in Role Management UI if needed.
7. Verify user assignment flow from User Management UI.

## Recommended Conventions

- Use noun-like resource names: `users`, `roles`, `reports`, `billing`.
- Use action names from smallest required scope:
  - `read`, `create`, `update`, `delete`, `manage`
  - or domain-specific actions like `approve`, `export`, `view_a`.
- Keep `manage` as a superset action where appropriate.
- Avoid role checks in business logic when a permission check can be used.

## Integration Checklist For Other Apps

- Define permission catalog early.
- Keep role names stable and human-readable.
- Build admin UI for both:
  - role-permission management
  - user-role assignment from existing roles
- Make API guards mandatory for protected operations.
- Keep nav and page visibility aligned with permissions to reduce confusion.
- Audit-log admin updates to roles and assignments.
