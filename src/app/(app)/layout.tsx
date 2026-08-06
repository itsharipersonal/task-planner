import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { ChallengeNav } from "@/components/challenges/nav";
import { getEnv, isAdminEmail } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const env = await getEnv();
  const admin = isAdminEmail(env, session.user.email ?? null);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <ChallengeNav isAdmin={admin} />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </div>
      <footer className="border-t border-line px-4 py-3 text-center font-mono text-[0.6rem] uppercase tracking-[0.25em] text-dim">
        Timed challenges · AI scoring · XP & streaks
      </footer>
    </div>
  );
}
