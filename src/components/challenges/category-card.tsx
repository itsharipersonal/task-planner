"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Difficulty } from "@/lib/challenges/types";

type CategoryCardProps = {
  id: string;
  name: string;
  tagline: string;
  glyph: string;
  submissionType: string;
  workMinutes: Record<Difficulty, number>;
  xpReward: Record<Difficulty, number>;
  isDaily?: boolean;
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

const SUBMISSION_LABEL: Record<string, string> = {
  video: "Submit a video",
  audio: "Submit audio",
  text: "Write your answer",
  quiz: "Answer a quiz",
  code: "Submit code",
  image: "Submit a photo",
};

export function CategoryCard(props: CategoryCardProps) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    const response = await fetch("/api/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: props.id,
        difficulty,
        isDaily: props.isDaily === true,
      }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Could not create challenge.");
      setGenerating(false);
      return;
    }
    const data = (await response.json()) as { attempt: { id: string } };
    router.push(`/challenges/${data.attempt.id}`);
  }

  return (
    <div
      className={`flex flex-col border-2 bg-panel ${
        props.isDaily ? "border-hazard" : "border-foreground"
      }`}
    >
      <div className="flex items-center justify-between border-b-2 border-foreground px-3 py-2">
        <span className="font-sans text-xl uppercase tracking-tight text-foreground">
          {props.glyph}
        </span>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-dim">
          {SUBMISSION_LABEL[props.submissionType] ?? props.submissionType}
        </span>
      </div>
      {props.isDaily ? (
        <div className="border-b-2 border-foreground bg-hazard px-3 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.25em] text-black">
          Today&apos;s challenge · 1.5× XP
        </div>
      ) : null}
      <div className="flex flex-1 flex-col px-3 py-3">
        <h3 className="font-sans text-lg uppercase leading-tight text-foreground">
          {props.name}
        </h3>
        <p className="mt-1 flex-1 font-mono text-[0.7rem] leading-relaxed text-dim">
          {props.tagline}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-1">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`border px-1 py-1 font-mono text-[0.6rem] uppercase tracking-[0.15em] transition-colors ${
                difficulty === d
                  ? "border-phos bg-phos/10 text-phos"
                  : "border-line text-dim hover:border-foreground hover:text-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
          <span>{props.workMinutes[difficulty]} min</span>
          <span className="text-phos">+{props.xpReward[difficulty]} XP</span>
        </div>

        {error ? (
          <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-hazard">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className="mt-3 border-2 border-foreground bg-background px-3 py-2 font-sans text-sm uppercase tracking-wide text-foreground transition-colors hover:border-hazard hover:bg-hazard hover:text-black disabled:opacity-50"
        >
          {generating ? "Creating..." : "Start"}
        </button>
      </div>
    </div>
  );
}
