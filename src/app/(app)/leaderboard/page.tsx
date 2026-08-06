import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { getEnv } from "@/lib/auth";
import { getLeaderboard } from "@/lib/challenges/service";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { scope: rawScope } = await searchParams;
  const scope = rawScope === "weekly" ? ("weekly" as const) : ("global" as const);

  const env = await getEnv();
  const entries = await getLeaderboard(env.DB, session.user.id, scope, 25);

  return (
    <div className="space-y-6">
      <section className="border-b-2 border-foreground pb-6">
        <h1 className="font-sans text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.85] tracking-[-0.03em]">
          Leader<span className="text-hazard">board</span>
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-dim">
          Ranked by XP earned from challenges
        </p>
      </section>

      <div className="flex gap-1">
        <Link
          href="/leaderboard"
          className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${
            scope === "global"
              ? "border-hazard bg-hazard text-black"
              : "border-line text-dim hover:border-foreground hover:text-foreground"
          }`}
        >
          All time
        </Link>
        <Link
          href="/leaderboard?scope=weekly"
          className={`border px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${
            scope === "weekly"
              ? "border-hazard bg-hazard text-black"
              : "border-line text-dim hover:border-foreground hover:text-foreground"
          }`}
        >
          This week
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="border-2 border-dashed border-line px-4 py-12 text-center font-mono text-sm uppercase tracking-[0.2em] text-dim">
          No one on the board yet
          {scope === "weekly" ? " this week" : ""}. Complete a challenge to appear here.
        </p>
      ) : (
        <ul className="grid gap-1 bg-line p-[1px]">
          {entries.map((entry) => (
            <li
              key={entry.userId}
              className={`flex items-center gap-4 px-4 py-3 ${
                entry.isMe ? "bg-panel outline outline-1 outline-hazard" : "bg-paper"
              }`}
            >
              <span
                className={`w-10 font-sans text-2xl ${
                  entry.rank === 1
                    ? "text-hazard"
                    : entry.rank <= 3
                      ? "text-phos"
                      : "text-dim"
                }`}
              >
                {String(entry.rank).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate font-mono text-sm uppercase tracking-[0.05em] ${entry.isMe ? "text-hazard" : "text-foreground"}`}>
                  {entry.name}
                  {entry.isMe ? " // YOU" : ""}
                </p>
              </div>
              <span className="font-mono text-sm text-phos">{entry.xp} XP</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
