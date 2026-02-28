"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  roles: string[];
};

export function UserTable() {
  const [users, setUsers] = useState<UserRow[]>([]);

  const load = async () => {
    const response = await fetch("/api/users", { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { users: UserRow[] };
    setUsers(data.users);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, isActive: !isActive }),
    });
    await load();
  };

  return (
    <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-900">
          <tr>
            <th className="px-3 py-2 text-left">Email</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Roles</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr className="border-t border-zinc-200 dark:border-zinc-800" key={user.id}>
              <td className="px-3 py-2">{user.email}</td>
              <td className="px-3 py-2">{user.displayName ?? "-"}</td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  {user.roles.map((role) => (
                    <Badge key={role}>{role}</Badge>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2">{user.isActive ? "Active" : "Disabled"}</td>
              <td className="px-3 py-2">
                <Button onClick={() => toggleActive(user.id, user.isActive)} size="sm" variant="outline">
                  {user.isActive ? "Disable" : "Enable"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
