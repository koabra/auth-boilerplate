"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <div className="flex items-center gap-3">
        <Button onClick={toggleTheme} size="sm" variant="outline">
          {theme === "dark" ? "Light" : "Dark"} mode
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
