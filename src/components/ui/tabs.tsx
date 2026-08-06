"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] transition-colors",
            active === tab.id
              ? "border-hazard bg-hazard text-black"
              : "border-line text-dim hover:border-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
