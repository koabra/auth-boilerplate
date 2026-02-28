"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RoleShape = {
  id: string;
  name: string;
  displayName: string;
  isSystem: boolean;
};

export function RoleEditor() {
  const [roles, setRoles] = useState<RoleShape[]>([]);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");

  const load = async () => {
    const response = await fetch("/api/roles", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { roles: RoleShape[] };
    setRoles(data.roles);
  };

  useEffect(() => {
    void load();
  }, []);

  const createRole = async (event: React.FormEvent) => {
    event.preventDefault();
    await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, displayName }),
    });
    setName("");
    setDisplayName("");
    await load();
  };

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
        <Button type="submit">Create Role</Button>
      </form>
      <ul className="space-y-2">
        {roles.map((role) => (
          <li className="rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800" key={role.id}>
            <span className="font-medium">{role.displayName}</span> ({role.name}) {role.isSystem ? "[system]" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
