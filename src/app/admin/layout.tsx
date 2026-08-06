import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import { adminPanelRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const role = session.user.role ?? "user";
  if (!adminPanelRole(role)) redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AdminSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar email={session.user.email ?? null} role={role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
