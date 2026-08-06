import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { CategoryCard } from "@/components/challenges/category-card";
import { ProgressBar } from "@/components/challenges/countdown";
import { getEnv } from "@/lib/auth";
import { getCategory } from "@/lib/challenges/registry";
import { getDashboardData } from "@/lib/challenges/service";
import { badgeById } from "@/lib/gamification";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Ready",
  preparing: "Preparing",
  active: "In progress",
  evaluating: "Scoring",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const env = await getEnv();
  const data = await getDashboardData(env, session.user.id);
  const dailyConfig = getCategory(data.daily.categoryId);
  const maxWeeklyXp = Math.max(1, ...data.weekly.map((d) => d.xp));
  const firstName = (session.user.name ?? "there").split(" ")[0];

  return (
    <div className="space-y-6">
      <section className="border-b-2 border-foreground pb-6">
        <h1 className="font-sans text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.85] tracking-[-0.03em]">
          Hi, <span className="text-hazard">{firstName}</span>
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-dim">
          Pick a challenge. Finish it before the timer ends. Earn XP.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-1 bg-line p-[1px] lg:grid-cols-4">
        <div className="bg-paper px-4 py-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-dim">Streak</p>
          <p className={`mt-1 font-sans text-4xl ${data.streak.current > 0 ? "text-hazard" : "text-foreground"}`}>
            {data.streak.current}
            <span className="text-lg text-dim"> days</span>
          </p>
          <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
            {data.streak.activeToday
              ? "Done for today"
              : data.streak.current > 0
                ? "Do one today to keep it"
                : `Best: ${data.streak.longest} days`}
          </p>
        </div>
        <div className="bg-paper px-4 py-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-dim">Level</p>
          <p className="mt-1 font-sans text-4xl text-foreground">{data.progress.level}</p>
          <div className="mt-2">
            <ProgressBar value={data.progress.intoLevel} max={data.progress.needed} />
          </div>
          <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
            {data.progress.intoLevel}/{data.progress.needed} XP to next
          </p>
        </div>
        <div className="bg-paper px-4 py-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-dim">Total XP</p>
          <p className="mt-1 font-sans text-4xl text-phos">{data.progress.xp}</p>
          <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
            Coins: {data.progress.coins}
          </p>
        </div>
        <div className="bg-paper px-4 py-4">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-dim">Completed</p>
          <p className="mt-1 font-sans text-4xl text-foreground">{data.progress.totalCompleted}</p>
          <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
            Failed: {data.progress.totalFailed}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <SectionHeader
              label="Today's challenge"
              extra={data.daily.done ? "Done" : "1.5× XP bonus"}
            />
            {data.daily.done ? (
              <div className="border-2 border-phos bg-phos/5 px-4 py-6 text-center">
                <p className="font-sans text-2xl uppercase text-phos">Done for today</p>
                <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
                  Come back tomorrow for a new one.
                </p>
              </div>
            ) : dailyConfig ? (
              <div className="max-w-sm">
                <CategoryCard
                  id={dailyConfig.id}
                  name={dailyConfig.name}
                  tagline={dailyConfig.tagline}
                  glyph={dailyConfig.glyph}
                  submissionType={dailyConfig.submissionType}
                  workMinutes={{
                    easy: Math.round(dailyConfig.workSeconds.easy / 60),
                    medium: Math.round(dailyConfig.workSeconds.medium / 60),
                    hard: Math.round(dailyConfig.workSeconds.hard / 60),
                  }}
                  xpReward={dailyConfig.xpReward}
                  isDaily
                />
              </div>
            ) : null}
          </section>

          <section>
            <SectionHeader
              label="In progress"
              extra={String(data.active.length)}
            />
            {data.active.length === 0 ? (
              <p className="border-2 border-dashed border-line px-4 py-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-dim">
                Nothing started yet.{" "}
                <Link href="/challenges" className="text-hazard hover:underline">
                  Browse challenges
                </Link>
              </p>
            ) : (
              <ul className="grid gap-1 bg-line p-[1px]">
                {data.active.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/challenges/${a.id}`}
                      className="flex items-center justify-between gap-4 bg-paper px-4 py-3 transition-colors hover:bg-panel"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm uppercase tracking-[0.05em] text-foreground">
                          {a.title}
                        </p>
                        <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
                          {getCategory(a.categoryId)?.name ?? a.categoryId} · {a.difficulty}
                        </p>
                      </div>
                      <span
                        className={`whitespace-nowrap border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] ${
                          a.status === "active"
                            ? "border-hazard text-hazard"
                            : "border-line text-dim"
                        }`}
                      >
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionHeader label="This week" extra="XP per day" />
            <div className="flex h-32 items-end gap-1 border-2 border-line bg-panel p-3">
              {data.weekly.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono text-[0.55rem] text-phos">
                    {d.xp > 0 ? d.xp : ""}
                  </span>
                  <div
                    className={`w-full ${d.xp > 0 ? "bg-phos" : "bg-line"}`}
                    style={{ height: `${Math.max(4, (d.xp / maxWeeklyXp) * 80)}px` }}
                  />
                  <span className="font-mono text-[0.55rem] uppercase text-dim">
                    {new Date(d.day).toLocaleDateString("en", { weekday: "narrow" })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHeader label="Recent results" extra="Last 5" />
            {data.recentCompleted.length === 0 ? (
              <p className="border-2 border-dashed border-line px-4 py-6 text-center font-mono text-xs uppercase tracking-[0.2em] text-dim">
                No completed challenges yet
              </p>
            ) : (
              <ul className="grid gap-1 bg-line p-[1px]">
                {data.recentCompleted.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/challenges/${a.id}`}
                      className="flex items-center justify-between gap-4 bg-paper px-4 py-2.5 transition-colors hover:bg-panel"
                    >
                      <span className="truncate font-mono text-xs uppercase text-foreground">
                        {a.title}
                      </span>
                      <span
                        className={`font-mono text-sm ${
                          (a.score ?? 0) >= 70 ? "text-phos" : "text-foreground"
                        }`}
                      >
                        {a.score ?? 0}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <SectionHeader
              label="Badges"
              extra={
                <Link href="/achievements" className="text-hazard hover:underline">
                  See all
                </Link>
              }
            />
            {data.badges.length === 0 ? (
              <p className="border-2 border-dashed border-line px-4 py-6 text-center font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
                Finish a challenge to earn badges
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1 bg-line p-[1px]">
                {data.badges.map((b) => {
                  const def = badgeById(b.id);
                  return (
                    <div
                      key={b.id}
                      title={def ? `${def.name} — ${def.description}` : b.id}
                      className="flex aspect-square flex-col items-center justify-center bg-paper"
                    >
                      <span className="font-sans text-lg text-phos">
                        {def?.glyph ?? "?"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <SectionHeader
              label="Leaderboard"
              extra={
                <Link href="/leaderboard" className="text-hazard hover:underline">
                  Full list
                </Link>
              }
            />
            {data.leaderboard.length === 0 ? (
              <p className="border-2 border-dashed border-line px-4 py-6 text-center font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
                No scores yet — be the first
              </p>
            ) : (
              <ul className="grid gap-1 bg-line p-[1px]">
                {data.leaderboard.map((entry) => (
                  <li
                    key={entry.userId}
                    className={`flex items-center justify-between gap-2 px-3 py-2 ${
                      entry.isMe ? "bg-panel" : "bg-paper"
                    }`}
                  >
                    <span className="font-mono text-xs text-dim">#{entry.rank}</span>
                    <span
                      className={`min-w-0 flex-1 truncate font-mono text-xs uppercase ${
                        entry.isMe ? "text-hazard" : "text-foreground"
                      }`}
                    >
                      {entry.name}
                      {entry.isMe ? " (you)" : ""}
                    </span>
                    <span className="font-mono text-xs text-phos">{entry.xp} XP</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border-2 border-foreground bg-panel px-4 py-4">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
              How it works
            </p>
            <ol className="mt-3 space-y-2 font-mono text-xs leading-relaxed text-foreground">
              <li>1. Pick a category</li>
              <li>2. Start the timer</li>
              <li>3. Submit your work</li>
              <li>4. Get scored and earn XP</li>
            </ol>
            <Link
              href="/challenges"
              className="mt-4 block border-2 border-foreground bg-hazard px-4 py-3 text-center font-sans text-lg uppercase tracking-wide text-black transition-colors hover:bg-foreground hover:text-background"
            >
              Start a challenge
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  extra,
}: {
  label: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
      <span>{label}</span>
      <span>{extra}</span>
    </div>
  );
}
