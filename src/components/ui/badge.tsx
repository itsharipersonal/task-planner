import { cn } from "@/lib/utils";

const variants = {
  default: "border-foreground bg-muted text-foreground",
  success: "border-phos bg-phos/10 text-phos",
  warning: "border-hazard bg-hazard/10 text-hazard",
  danger: "border-destructive bg-destructive/10 text-destructive",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.1em]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
