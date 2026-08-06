import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "w-full border-2 border-foreground bg-background px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-dim focus:border-hazard",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full border-2 border-foreground bg-background px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-dim focus:border-hazard",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "w-full border-2 border-foreground bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-hazard",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        "font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim",
        className,
      )}
      {...props}
    />
  );
}
