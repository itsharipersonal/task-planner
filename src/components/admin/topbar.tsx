import type { UserRole } from "@/types/admin";

export function AdminTopbar({
  email,
  role,
}: {
  email: string | null;
  role: UserRole;
}) {
  return (
    <header className="flex items-center justify-between border-b-2 border-foreground bg-background px-6 py-3">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-dim">
        Admin panel · operational dashboard
      </p>
      <div className="text-right">
        <p className="font-mono text-[0.65rem] text-foreground">{email}</p>
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.15em] text-hazard">
          {role.replace("_", " ")}
        </p>
      </div>
    </header>
  );
}
