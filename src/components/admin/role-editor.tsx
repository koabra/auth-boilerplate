"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type RoleShape = {
  id: string;
  name: string;
  displayName: string;
  isSystem: boolean;
  permissions: string[];
};

type PermissionShape = {
  id: string;
  resource: string;
  action: string;
};

async function toErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

export function RoleEditor() {
  const [roles, setRoles] = useState<RoleShape[]>([]);
  const [permissions, setPermissions] = useState<PermissionShape[]>([]);
  const [draftPermissionIds, setDraftPermissionIds] = useState<Record<string, string[]>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [rolesResponse, permissionsResponse] = await Promise.all([
      fetch("/api/roles", { cache: "no-store" }),
      fetch("/api/permissions", { cache: "no-store" }),
    ]);
    if (!rolesResponse.ok) {
      setError(await toErrorMessage(rolesResponse, "Could not load roles"));
      setLoading(false);
      return;
    }
    if (!permissionsResponse.ok) {
      setError(await toErrorMessage(permissionsResponse, "Could not load permissions"));
      setLoading(false);
      return;
    }
    const rolesData = (await rolesResponse.json()) as { roles: RoleShape[] };
    const permissionsData = (await permissionsResponse.json()) as { permissions: PermissionShape[] };
    setRoles(rolesData.roles);
    setPermissions(permissionsData.permissions);

    const permissionIdByKey = new Map(
      permissionsData.permissions.map((permission) => [
        `${permission.resource}:${permission.action}`,
        permission.id,
      ]),
    );
    setDraftPermissionIds(
      Object.fromEntries(
        rolesData.roles.map((role) => [
          role.id,
          role.permissions
            .map((permissionKey) => permissionIdByKey.get(permissionKey))
            .filter((permissionId): permissionId is string => Boolean(permissionId)),
        ]),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, displayName }),
    });
    if (!response.ok) {
      setError(await toErrorMessage(response, "Could not create role"));
      return;
    }
    setName("");
    setDisplayName("");
    await load();
  };

  const togglePermission = (roleId: string, permissionId: string, checked: boolean) => {
    setDraftPermissionIds((prev) => {
      const current = prev[roleId] ?? [];
      if (checked) {
        if (current.includes(permissionId)) return prev;
        return { ...prev, [roleId]: [...current, permissionId] };
      }
      return { ...prev, [roleId]: current.filter((id) => id !== permissionId) };
    });
  };

  const saveRolePermissions = async (roleId: string) => {
    setError(null);
    setSavingRoleId(roleId);
    const response = await fetch("/api/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId,
        permissionIds: draftPermissionIds[roleId] ?? [],
      }),
    });
    setSavingRoleId(null);
    if (!response.ok) {
      setError(await toErrorMessage(response, "Could not update role permissions"));
      return;
    }
    await load();
  };

  const permissionsByResource = permissions.reduce<Record<string, PermissionShape[]>>((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={createRole}>
        <Input onChange={(event) => setName(event.target.value)} placeholder="role_name" required value={name} />
        <Input
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Role Display Name"
          required
          value={displayName}
        />
        <Button data-track="admin.roles.create" type="submit">
          Create Role
        </Button>
      </form>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading roles and permissions...</p> : null}
      <div className="space-y-3">
        {roles.map((role) => (
          <Card className="space-y-3 p-4" key={role.id}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">
                {role.displayName} ({role.name})
              </p>
              {role.isSystem ? <Badge>system</Badge> : null}
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Active permissions: {role.permissions.length ? role.permissions.join(", ") : "none"}
            </p>
            <div className="space-y-3">
              {Object.entries(permissionsByResource).map(([resource, resourcePermissions]) => (
                <div key={resource}>
                  <p className="mb-1 text-xs font-semibold uppercase text-[var(--muted-foreground)]">{resource}</p>
                  <div className="flex flex-wrap gap-3">
                    {resourcePermissions.map((permission) => {
                      const checked = (draftPermissionIds[role.id] ?? []).includes(permission.id);
                      return (
                        <label className="flex items-center gap-2 text-sm" key={permission.id}>
                          <input
                            checked={checked}
                            onChange={(event) => togglePermission(role.id, permission.id, event.target.checked)}
                            type="checkbox"
                          />
                          <span>{permission.action}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <Button
                data-track="admin.roles.save_permissions"
                disabled={savingRoleId === role.id}
                onClick={() => saveRolePermissions(role.id)}
                size="sm"
                variant="outline"
              >
                {savingRoleId === role.id ? "Saving..." : "Save permissions"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
