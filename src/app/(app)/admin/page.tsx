import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { AdminPanel } from "@/components/challenges/admin-panel";
import { getEnv, isAdminEmail } from "@/lib/auth";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const env = await getEnv();
  if (!isAdminEmail(env, session.user.email ?? null)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <section className="border-b-2 border-foreground pb-6">
        <h1 className="font-sans text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.85] tracking-[-0.03em]">
          Control <span className="text-hazard">Room</span>
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-dim">
          &gt; Admin clearance / {session.user.email}
        </p>
      </section>
      <AdminPanel />
    </div>
  );
}
