import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { getEnv } from "@/lib/auth";
import { BADGES } from "@/lib/gamification";

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const env = await getEnv();
  const { results } = await env.DB.prepare(
    "SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?",
  )
    .bind(session.user.id)
    .all<{ badge_id: string; earned_at: string }>();
  const earned = new Map((results ?? []).map((r) => [r.badge_id, r.earned_at]));

  return (
    <div className="space-y-6">
      <section className="border-b-2 border-foreground pb-6">
        <h1 className="font-sans text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.85] tracking-[-0.03em]">
          Badge<span className="text-hazard">s</span>
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-dim">
          {earned.size} of {BADGES.length} unlocked
        </p>
      </section>

      <div className="grid gap-1 bg-line p-[1px] sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((badge) => {
          const earnedAt = earned.get(badge.id);
          return (
            <div
              key={badge.id}
              className={`flex items-center gap-4 px-4 py-4 ${
                earnedAt ? "bg-paper" : "bg-panel opacity-60"
              }`}
            >
              <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center border-2 font-sans text-lg ${
                  earnedAt ? "border-phos text-phos" : "border-line text-dim"
                }`}
              >
                {badge.glyph}
              </span>
              <div className="min-w-0">
                <p
                  className={`font-mono text-sm uppercase tracking-[0.05em] ${
                    earnedAt ? "text-foreground" : "text-dim"
                  }`}
                >
                  {badge.name}
                </p>
                <p className="mt-1 font-mono text-[0.65rem] leading-relaxed text-dim">
                  {badge.description}
                </p>
                <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
                  {earnedAt ? `Earned ${earnedAt.slice(0, 10)}` : "Locked"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
