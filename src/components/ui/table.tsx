import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse font-mono text-xs", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn("border-b-2 border-foreground bg-muted/50", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return <tbody className={cn("divide-y divide-line", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("hover:bg-muted/30", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-left font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("px-3 py-2 text-foreground", className)}
      {...props}
    />
  );
}
