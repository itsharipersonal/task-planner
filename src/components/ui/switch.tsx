"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-5 w-9 border-2 border-foreground transition-colors",
          checked ? "bg-hazard" : "bg-background",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 bg-foreground transition-transform",
            checked ? "translate-x-4 bg-black" : "translate-x-0.5",
          )}
        />
      </button>
      {label ? (
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-dim">
          {label}
        </span>
      ) : null}
    </label>
  );
}
