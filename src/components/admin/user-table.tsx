"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type UserRow = {
  id: string;
  email: string;
  pseudonym: string;
  realName: string | null;
  displayName: string | null;
  isActive: boolean;
  roles: string[];
};

type RoleOption = {
  id: string;
  name: string;
  displayName: string;
  isSystem: boolean;
};

async function toErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

export function UserTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [assignableRoles, setAssignableRoles] = useState<RoleOption[]>([]);
  const [roleDraft, setRoleDraft] = useState<Record<string, string[]>>({});
  const [resetLinkByUser, setResetLinkByUser] = useState<Record<string, string>>({});
  const [resetStatusByUser, setResetStatusByUser] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/users", { cache: "no-store" });
    if (!response.ok) {
      setError(await toErrorMessage(response, "Could not load users"));
      return;
    }
    const data = (await response.json()) as { users: UserRow[]; assignableRoles: RoleOption[] };
    setUsers(data.users);
    setAssignableRoles(data.assignableRoles);
    setRoleDraft(
      Object.fromEntries(
        data.users.map((user) => [user.id, user.roles.includes("user") ? user.roles : [...user.roles, "user"]]),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, isActive: !isActive }),
    });
    await load();
  };

  const saveRoles = async (id: string) => {
    setError(null);
    const response = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, roleNames: roleDraft[id] ?? [] }),
    });
    if (!response.ok) {
      setError(await toErrorMessage(response, "Could not save roles"));
      return;
    }
    await load();
  };

  const toggleRole = (userId: string, roleName: string, checked: boolean) => {
    if (roleName === "user") return;
    setRoleDraft((prev) => {
      const current = prev[userId] ?? [];
      if (checked) {
        if (current.includes(roleName)) return prev;
        return { ...prev, [userId]: [...current, roleName] };
      }
      return { ...prev, [userId]: current.filter((name) => name !== roleName) };
    });
  };

  const sendPasswordReset = async (id: string) => {
    setError(null);
    setResetStatusByUser((prev) => ({ ...prev, [id]: "Sending..." }));
    const response = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, sendPasswordReset: true }),
    });
    if (!response.ok) {
      setError(await toErrorMessage(response, "Could not send reset email"));
      setResetStatusByUser((prev) => ({ ...prev, [id]: "Reset request failed." }));
      return;
    }
    const payload = (await response.json()) as {
      resetLink?: string;
      resetEmailSent?: boolean;
      resetEmailError?: string | null;
    };
    if (payload.resetLink) {
      setResetLinkByUser((prev) => ({ ...prev, [id]: payload.resetLink ?? "" }));
    }
    if (payload.resetEmailSent) {
      setResetStatusByUser((prev) => ({ ...prev, [id]: "Reset email sent via Firebase." }));
      return;
    }
    if (payload.resetEmailError) {
      setResetStatusByUser((prev) => ({ ...prev, [id]: `Link generated, email send failed: ${payload.resetEmailError}` }));
      return;
    }
    setResetStatusByUser((prev) => ({ ...prev, [id]: "Link generated." }));
  };

  return (
    <div className="space-y-4">
      <div className="hidden overflow-x-auto rounded-xl border border-[var(--border)] md:block">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-2)]">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Public Name</th>
              <th className="px-3 py-2 text-left">Roles</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-[var(--border)]" key={user.id}>
                <td className="px-3 py-2">{user.email}</td>
                <td className="px-3 py-2">@{user.pseudonym}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <Badge key={role}>{role}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">{user.isActive ? "Active" : "Disabled"}</td>
                <td className="space-y-2 px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      data-track="admin.users.toggle_active"
                      onClick={() => toggleActive(user.id, user.isActive)}
                      size="sm"
                      variant="outline"
                    >
                      {user.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      data-track="admin.users.reset_password"
                      onClick={() => sendPasswordReset(user.id)}
                      size="sm"
                      variant="secondary"
                    >
                      Reset Password
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-3">
                      {assignableRoles.map((role) => (
                        <label className="flex items-center gap-2 text-xs" key={`${user.id}-${role.id}`}>
                          <input
                            checked={(roleDraft[user.id] ?? []).includes(role.name)}
                            disabled={role.name === "user"}
                            onChange={(event) => toggleRole(user.id, role.name, event.target.checked)}
                            type="checkbox"
                          />
                          <span>
                            {role.displayName} ({role.name})
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      The default `user` role is required and cannot be removed.
                    </p>
                    <Button
                      data-track="admin.users.assign_roles"
                      onClick={() => saveRoles(user.id)}
                      size="sm"
                      variant="outline"
                    >
                      Save roles
                    </Button>
                  </div>
                  {resetLinkByUser[user.id] ? (
                    <p className="break-all text-xs text-[var(--muted-foreground)]">{resetLinkByUser[user.id]}</p>
                  ) : null}
                  {resetStatusByUser[user.id] ? (
                    <p className="text-xs text-[var(--muted-foreground)]">{resetStatusByUser[user.id]}</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <Card className="space-y-3 p-4" key={user.id}>
            <div>
              <p className="text-sm font-semibold">{user.email}</p>
              <p className="text-sm text-[var(--muted-foreground)]">@{user.pseudonym}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role}>{role}</Badge>
              ))}
            </div>
            <p className="text-sm">{user.isActive ? "Active" : "Disabled"}</p>
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={() => toggleActive(user.id, user.isActive)} size="sm" variant="outline">
                {user.isActive ? "Disable" : "Enable"}
              </Button>
              <Button onClick={() => sendPasswordReset(user.id)} size="sm" variant="secondary">
                Reset Password
              </Button>
              <div className="flex flex-wrap gap-2">
                {assignableRoles.map((role) => (
                  <label className="flex items-center gap-2 text-xs" key={`${user.id}-mobile-${role.id}`}>
                    <input
                      checked={(roleDraft[user.id] ?? []).includes(role.name)}
                      disabled={role.name === "user"}
                      onChange={(event) => toggleRole(user.id, role.name, event.target.checked)}
                      type="checkbox"
                    />
                    <span>
                      {role.displayName} ({role.name})
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                The default `user` role is required and cannot be removed.
              </p>
              <Button onClick={() => saveRoles(user.id)} size="sm" variant="outline">
                Save roles
              </Button>
            </div>
            {resetLinkByUser[user.id] ? (
              <p className="break-all text-xs text-[var(--muted-foreground)]">{resetLinkByUser[user.id]}</p>
            ) : null}
            {resetStatusByUser[user.id] ? (
              <p className="text-xs text-[var(--muted-foreground)]">{resetStatusByUser[user.id]}</p>
            ) : null}
          </Card>
        ))}
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
