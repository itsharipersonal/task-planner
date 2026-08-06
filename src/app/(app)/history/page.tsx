import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { getEnv } from "@/lib/auth";
import { getCategory } from "@/lib/challenges/registry";
import { getHistory } from "@/lib/challenges/service";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const env = await getEnv();
  const attempts = await getHistory(env.DB, session.user.id);

  return (
    <div className="space-y-6">
      <section className="border-b-2 border-foreground pb-6">
        <h1 className="font-sans text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.85] tracking-[-0.03em]">
          History
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-dim">
          All your past challenge results
        </p>
      </section>

      {attempts.length === 0 ? (
        <p className="border-2 border-dashed border-line px-4 py-12 text-center font-mono text-sm uppercase tracking-[0.2em] text-dim">
          No history yet.{" "}
          <Link href="/challenges" className="text-hazard hover:underline">
            Start your first challenge
          </Link>
        </p>
      ) : (
        <ul className="grid gap-1 bg-line p-[1px]">
          {attempts.map((a) => (
            <li key={a.id}>
              <Link
                href={`/challenges/${a.id}`}
                className="flex items-center gap-4 bg-paper px-4 py-3 transition-colors hover:bg-panel"
              >
                <span
                  className={`w-12 shrink-0 text-center font-sans text-xl ${
                    a.status === "failed"
                      ? "text-hazard"
                      : (a.score ?? 0) >= 70
                        ? "text-phos"
                        : "text-foreground"
                  }`}
                >
                  {a.status === "failed" ? "X" : String(a.score ?? 0).padStart(3, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm uppercase tracking-[0.05em] text-foreground">
                    {a.title}
                  </p>
                  <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
                    {getCategory(a.categoryId)?.name ?? a.categoryId} / {a.difficulty}
                    {a.isDaily ? " / DAILY" : ""} · {a.createdAt.slice(0, 10)}
                  </p>
                </div>
                <span
                  className={`whitespace-nowrap border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] ${
                    a.status === "failed" ? "border-hazard text-hazard" : "border-line text-dim"
                  }`}
                >
                  {a.status === "failed" ? "FAILED" : `+${a.xpAwarded ?? 0} XP`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
