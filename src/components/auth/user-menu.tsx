"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";

export function UserMenu() {
  const router = useRouter();
  const { user } = useAuth();

  const signOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium">{user.displayName ?? user.email}</p>
        <p className="text-xs text-zinc-500">{user.roles.join(", ")}</p>
      </div>
      <Button onClick={signOut} size="sm" variant="outline">
        Sign out
      </Button>
    </div>
  );
}
