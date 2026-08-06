import { redirect } from "next/navigation";
import { auth } from "@/app/auth";
import { CategoryCard } from "@/components/challenges/category-card";
import { getEnv } from "@/lib/auth";
import { listEnabledMergedCategories } from "@/lib/challenges/categories";
import { dailyCategoryId } from "@/lib/challenges/registry";

export default async function ChallengesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const env = await getEnv();
  const categories = await listEnabledMergedCategories(env.DB);
  const daily = dailyCategoryId(new Date());

  return (
    <div className="space-y-6">
      <section className="border-b-2 border-foreground pb-6">
        <h1 className="font-sans text-[clamp(2.5rem,8vw,5rem)] uppercase leading-[0.85] tracking-[-0.03em]">
          Choose a <span className="text-hazard">challenge</span>
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-dim">
          Pick a type and difficulty. We create a timed task for you.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((config) => (
          <CategoryCard
            key={config.id}
            id={config.id}
            name={config.name}
            tagline={config.description ?? config.tagline}
            glyph={config.glyph}
            submissionType={config.submissionType}
            workMinutes={{
              easy: Math.round(config.workSeconds.easy / 60),
              medium: Math.round(config.workSeconds.medium / 60),
              hard: Math.round(config.workSeconds.hard / 60),
            }}
            xpReward={config.xpReward}
            isDaily={config.id === daily}
          />
        ))}
      </div>
    </div>
  );
}
