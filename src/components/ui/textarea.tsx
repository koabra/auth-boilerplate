import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none ring-offset-white focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:ring-offset-zinc-950",
        className,
      )}
      {...props}
    />
  );
}
