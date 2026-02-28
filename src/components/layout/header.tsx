"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";

type HeaderProps = {
  onToggleSidebar?: () => void;
};

export function Header({ onToggleSidebar }: HeaderProps) {
  const { themeMode, setThemeMode } = useTheme();
  const options: Array<{ label: "Light" | "Dark" | "System"; value: "light" | "dark" | "system" }> =
    [
      { label: "Light", value: "light" },
      { label: "Dark", value: "dark" },
      { label: "System", value: "system" },
    ];

  return (
    <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 md:px-6 md:py-4">
      <div className="flex items-center gap-2">
        <Button className="md:hidden" onClick={onToggleSidebar} size="sm" variant="outline">
          Menu
        </Button>
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
          {options.map((option) => (
            <button
              key={option.value}
              className={
                themeMode === option.value
                  ? "rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)] transition-colors"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              }
              onClick={() => setThemeMode(option.value)}
              data-track={`theme.select.${option.value}`}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
