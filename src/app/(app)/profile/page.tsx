import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { ProgressBar } from "@/components/challenges/countdown";
import { getEnv } from "@/lib/auth";
import { getCategory } from "@/lib/challenges/registry";
import { getProfileData } from "@/lib/challenges/service";
import { badgeById } from "@/lib/gamification";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const env = await getEnv();
  const data = await getProfileData(env, session.user.id);
  const favorite = data.favoriteCategory ? getCategory(data.favoriteCategory) : null;

  const stats: { label: string; value: string; tone?: string }[] = [
    { label: "Level", value: String(data.level) },
    { label: "Total XP", value: String(data.xp), tone: "text-phos" },
    { label: "Coins", value: String(data.coins) },
    { label: "Completed", value: String(data.totalCompleted) },
    { label: "Success rate", value: `${data.successRate}%` },
    { label: "Avg score", value: String(data.averageScore) },
    { label: "Longest streak", value: `${data.longestStreak} days`, tone: "text-hazard" },
    { label: "Hours practiced", value: String(data.totalHours) },
  ];

  return (
    <div className="space-y-6">
      <section className="border-b-2 border-foreground pb-6">
        <h1 className="font-sans text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.85] tracking-[-0.03em]">
          Your <span className="text-hazard">profile</span>
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-dim">
          {session.user.name ?? session.user.email}
          {favorite ? ` · Favorite: ${favorite.name}` : ""}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-1 bg-line p-[1px] sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-paper px-4 py-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.25em] text-dim">{s.label}</p>
            <p className={`mt-1 font-sans text-3xl ${s.tone ?? "text-foreground"}`}>{s.value}</p>
          </div>
        ))}
      </section>

      <section>
        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
          [ Level progress ]
        </p>
        <div className="border-2 border-line bg-panel px-4 py-4">
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.15em]">
            <span className="text-foreground">LVL {data.level}</span>
            <span className="text-dim">{data.intoLevel}/{data.needed} XP</span>
            <span className="text-foreground">LVL {data.level + 1}</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={data.intoLevel} max={data.needed} />
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
          By category
        </p>
        {data.perCategory.length === 0 ? (
          <p className="border-2 border-dashed border-line px-4 py-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-dim">
            No completed challenges yet
          </p>
        ) : (
          <ul className="grid gap-1 bg-line p-[1px] sm:grid-cols-2">
            {data.perCategory.map((c) => {
              const config = getCategory(c.categoryId);
              return (
                <li key={c.categoryId} className="bg-paper px-4 py-3">
                  <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.1em]">
                    <span className="text-foreground">{config?.name ?? c.categoryId}</span>
                    <span className="text-dim">×{c.completed}</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={c.avgScore} max={100} tone={c.avgScore >= 70 ? "phos" : "foreground"} />
                  </div>
                  <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
                    AVG SCORE / {c.avgScore}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
          <span>Badges · {data.badges.length}</span>
          <Link href="/achievements" className="text-hazard hover:underline">
            See all
          </Link>
        </div>
        {data.badges.length === 0 ? (
          <p className="border-2 border-dashed border-line px-4 py-8 text-center font-mono text-xs uppercase tracking-[0.2em] text-dim">
            Finish a challenge to earn badges
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1 bg-line p-[1px] sm:grid-cols-6">
            {data.badges.map((b) => {
              const def = badgeById(b.id);
              return (
                <div key={b.id} className="flex aspect-square flex-col items-center justify-center gap-1 bg-paper px-2 text-center">
                  <span className="font-sans text-xl text-phos">{def?.glyph ?? "?"}</span>
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-dim">
                    {def?.name ?? b.id}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
