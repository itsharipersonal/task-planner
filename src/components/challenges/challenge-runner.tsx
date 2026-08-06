"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Attempt,
  DimensionScore,
  SubmissionInput,
} from "@/lib/challenges/types";
import { Countdown, ProgressBar } from "./countdown";
import { MediaCapture } from "./media-capture";

type FeedbackDto = {
  overallScore: number;
  dimensionScores: DimensionScore[];
  strengths: string[];
  improvements: string[];
  summary: string;
  nextChallenge: string | null;
  aiGenerated: boolean;
};

type SubmitResponse = {
  attempt: Attempt;
  evaluation: FeedbackDto;
  xpAwarded: number;
  coinsAwarded: number;
  newBadges: { id: string; name: string; description: string }[];
  streak: { current: number; longest: number; extended: boolean };
  level: { before: number; after: number };
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "Ready",
  preparing: "Prep time",
  active: "In progress",
  submitted: "Submitted",
  evaluating: "Scoring",
  completed: "Done",
  failed: "Failed",
};

export function ChallengeRunner({ attemptId }: { attemptId: string }) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [feedback, setFeedback] = useState<FeedbackDto | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [recording, setRecording] = useState(false);

  const submittingRef = useRef(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/challenges/${attemptId}`);
    if (!response.ok) {
      setError(response.status === 404 ? "Challenge not found." : "Failed to load challenge.");
      setLoading(false);
      return;
    }
    const data = (await response.json()) as {
      attempt: Attempt;
      feedback: FeedbackDto | null;
      serverNow: number;
    };
    setAttempt(data.attempt);
    setFeedback(data.feedback);
    setClockOffset(data.serverNow - Date.now());
    setLoading(false);
  }, [attemptId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  // If we land on an attempt that is mid-evaluation, poll until it settles.
  useEffect(() => {
    if (attempt?.status !== "evaluating" || result) return;
    const interval = setInterval(() => void load(), 3000);
    return () => clearInterval(interval);
  }, [attempt?.status, result, load]);

  async function start() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/challenges/${attemptId}/start`, {
      method: "POST",
    });
    if (response.ok) {
      const data = (await response.json()) as {
        attempt: Attempt;
        serverNow: number;
      };
      setAttempt(data.attempt);
      setClockOffset(data.serverNow - Date.now());
    } else {
      setError("Could not start the challenge.");
    }
    setBusy(false);
  }

  async function abandon() {
    if (!window.confirm("Abandon this challenge? It will be recorded as FAILED.")) return;
    setBusy(true);
    await fetch(`/api/challenges/${attemptId}/abandon`, { method: "POST" });
    await load();
    setBusy(false);
  }

  const submit = useCallback(
    async (auto: boolean) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);

      const current = attempt;
      const submission: SubmissionInput = {};
      if (current?.submissionType === "quiz") {
        submission.answers = (current.payload?.quiz ?? []).map(
          (_, i) => answers[i] ?? "",
        );
      } else if (
        current?.submissionType === "video" ||
        current?.submissionType === "audio"
      ) {
        submission.text = transcript;
        submission.durationSeconds = duration;
      } else {
        submission.text = text;
        if (current?.submissionType === "code" && url.trim()) {
          submission.url = url.trim();
        }
      }

      const response = await fetch(`/api/challenges/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Submission failed.");
        setSubmitting(false);
        submittingRef.current = false;
        await load();
        return;
      }

      const data = (await response.json()) as SubmitResponse;
      setResult(data);
      setAttempt(data.attempt);
      setFeedback(data.evaluation);
      setSubmitting(false);
      if (auto) setError("Time expired — your work was auto-submitted.");
    },
    [attempt, attemptId, answers, transcript, duration, text, url, load],
  );

  const onWorkExpire = useCallback(() => {
    // The deadline is the deadline: whatever exists gets submitted.
    if (attempt?.status === "active" && !submittingRef.current) {
      void submit(true);
    }
  }, [attempt?.status, submit]);

  const onPrepExpire = useCallback(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Panel title="Challenge" sub="Loading">
        <p className="px-6 py-12 text-center font-mono text-sm uppercase tracking-[0.2em] text-dim">
          Loading your challenge...
        </p>
      </Panel>
    );
  }

  if (!attempt) {
    return (
      <Panel title="Challenge" sub="Error">
        <p className="px-6 py-12 text-center font-mono text-sm uppercase tracking-[0.2em] text-hazard">
          {error ?? "Something went wrong."}
        </p>
      </Panel>
    );
  }

  if (submitting || (result === null && attempt.status === "evaluating")) {
    return (
      <Panel title={attempt.title} sub="Scoring">
        <div className="px-6 py-16 text-center">
          <p className="font-sans text-3xl uppercase text-foreground">
            Scoring your work
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-dim">
            AI is reviewing your submission. This takes a few seconds.
          </p>
        </div>
      </Panel>
    );
  }

  if (result || attempt.status === "completed" || attempt.status === "failed") {
    return (
      <ResultScreen
        attempt={attempt}
        feedback={result?.evaluation ?? feedback}
        result={result}
        userAnswers={answers}
        notice={error}
      />
    );
  }

  return (
    <Panel
      title={attempt.title}
      sub={STATUS_LABEL[attempt.status] ?? attempt.status}
      danger={attempt.status === "active"}
    >
      <div className="space-y-4 px-4 py-4 sm:px-6">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
          <span>{attempt.categoryId.replace(/-/g, " ")}</span>
          <span>{attempt.difficulty}</span>
          <span>Submit: {attempt.submissionType}</span>
          {attempt.isDaily ? <span className="text-hazard">Daily · 1.5× XP</span> : null}
        </header>

        <div className="border-y-2 border-foreground py-4">
          <p className="font-mono text-sm leading-relaxed text-foreground">
            {attempt.description}
          </p>
          <p className="mt-3 whitespace-pre-line font-mono text-xs leading-relaxed text-dim">
            {attempt.instructions}
          </p>
        </div>

        {attempt.status === "not_started" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 bg-line p-[1px]">
              <Stat
                label="Prep time"
                value={
                  attempt.prepSeconds > 0
                    ? `${Math.round(attempt.prepSeconds / 60)} min`
                    : "None"
                }
              />
              <Stat
                label="Work time"
                value={`${Math.round(attempt.workSeconds / 60)} min`}
              />
            </div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-dim">
              Once you start, the timer runs. Leaving counts as a fail.
            </p>
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy}
              className="w-full border-2 border-foreground bg-hazard px-4 py-4 font-sans text-xl uppercase tracking-wide text-black transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {busy
                ? "Starting..."
                : attempt.prepSeconds > 0
                  ? "Start prep"
                  : "Start timer"}
            </button>
          </div>
        ) : null}

        {attempt.status === "preparing" && attempt.prepEndsAt ? (
          <div className="space-y-4">
            <div className="border-2 border-line bg-panel px-4 py-6 text-center">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
                Prep time left
              </p>
              <div className="mt-2 font-sans text-6xl">
                <Countdown
                  endsAt={attempt.prepEndsAt}
                  clockOffset={clockOffset}
                  onExpire={onPrepExpire}
                />
              </div>
              <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-dim">
                When prep ends, the work timer starts automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void start()}
              disabled={busy}
              className="w-full border-2 border-foreground bg-background px-4 py-3 font-sans text-lg uppercase tracking-wide text-foreground transition-colors hover:border-hazard hover:bg-hazard hover:text-black disabled:opacity-50"
            >
              Skip prep — start now
            </button>
          </div>
        ) : null}

        {attempt.status === "active" && attempt.workEndsAt ? (
          <div className="space-y-4">
            <div className="sticky top-12 z-40 flex items-center justify-between border-2 border-hazard bg-background px-4 py-2">
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
                Time left
              </span>
              <span className="font-sans text-3xl">
                <Countdown
                  endsAt={attempt.workEndsAt}
                  clockOffset={clockOffset}
                  onExpire={onWorkExpire}
                />
              </span>
            </div>

            {attempt.payload?.article ? (
              <div className="max-h-96 overflow-y-auto border-2 border-line bg-paper px-4 py-3">
                <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
                  Read this first
                </p>
                <p className="whitespace-pre-line font-mono text-sm leading-relaxed text-foreground">
                  {attempt.payload.article}
                </p>
              </div>
            ) : null}

            {attempt.submissionType === "quiz" ? (
              <QuizForm
                quiz={attempt.payload?.quiz ?? []}
                answers={answers}
                setAnswers={setAnswers}
              />
            ) : attempt.submissionType === "video" || attempt.submissionType === "audio" ? (
              <div className="space-y-3">
                <MediaCapture
                  mode={attempt.submissionType}
                  onRecordingChange={setRecording}
                  onCaptured={({ durationSeconds, transcript: captured }) => {
                    setDuration(durationSeconds);
                    setTranscript((prev) => (captured ? captured : prev));
                  }}
                />
                <div>
                  <p className="mb-1 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim">
                    What you said (edit if needed)
                  </p>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={6}
                    placeholder="Your words appear here after recording. If they don't, type what you said."
                    className="w-full border-2 border-line bg-paper px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-dim/50 focus:border-foreground"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {attempt.submissionType === "code" ? (
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Optional: GitHub or repo link"
                    className="w-full border-2 border-line bg-paper px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-dim/50 focus:border-foreground"
                  />
                ) : null}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={attempt.submissionType === "code" ? 16 : 12}
                  spellCheck={attempt.submissionType !== "code"}
                  placeholder={
                    attempt.submissionType === "code"
                      ? "Paste your code here"
                      : attempt.submissionType === "image"
                        ? "Describe what you did, your numbers, and your proof"
                        : "Type your answer here"
                  }
                  className="w-full border-2 border-line bg-paper px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-dim/50 focus:border-foreground"
                />
                <p className="text-right font-mono text-[0.6rem] uppercase tracking-[0.15em] text-dim">
                  {text.trim() ? `${text.trim().split(/\s+/).length} words` : "0 words"}
                </p>
              </div>
            )}

            {error ? (
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-hazard">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={busy || recording}
              className="w-full border-2 border-foreground bg-hazard px-4 py-4 font-sans text-xl uppercase tracking-wide text-black transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {recording ? "Stop recording first" : "Submit"}
            </button>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void abandon()}
            className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dim transition-colors hover:text-hazard"
          >
            Quit (counts as fail)
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Panel({
  title,
  sub,
  danger,
  children,
}: {
  title: string;
  sub: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl border-2 border-foreground bg-panel">
      <header className="flex items-center justify-between gap-4 border-b-2 border-foreground px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.2em]">
        <span className="truncate text-foreground">{title}</span>
        <span className={danger ? "text-hazard" : "text-dim"}>{sub}</span>
      </header>
      {children}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-paper px-4 py-3">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-dim">{label}</p>
      <p className="mt-1 font-sans text-xl uppercase text-foreground">{value}</p>
    </div>
  );
}

function QuizForm({
  quiz,
  answers,
  setAnswers,
}: {
  quiz: { question: string; options?: string[] }[];
  answers: Record<number, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
}) {
  return (
    <ol className="space-y-3">
      {quiz.map((q, i) => (
        <li key={i} className="border-2 border-line bg-paper px-4 py-3">
          <p className="font-mono text-sm text-foreground">
            <span className="text-dim">{String(i + 1).padStart(2, "0")} /</span>{" "}
            {q.question}
          </p>
          {q.options && q.options.length > 0 ? (
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {q.options.map((option, oi) => (
                <button
                  key={oi}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [i]: String(oi) }))}
                  className={`border px-3 py-2 text-left font-mono text-xs transition-colors ${
                    answers[i] === String(oi)
                      ? "border-phos bg-phos/10 text-phos"
                      : "border-line text-foreground hover:border-foreground"
                  }`}
                >
                  [{String.fromCharCode(65 + oi)}] {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              value={answers[i] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
              inputMode="decimal"
              placeholder="ANSWER"
              className="mt-2 w-40 border-2 border-line bg-background px-3 py-1.5 font-mono text-sm text-foreground outline-none focus:border-phos"
            />
          )}
        </li>
      ))}
    </ol>
  );
}

function ResultScreen({
  attempt,
  feedback,
  result,
  userAnswers,
  notice,
}: {
  attempt: Attempt;
  feedback: FeedbackDto | null;
  result: SubmitResponse | null;
  userAnswers: Record<number, string>;
  notice: string | null;
}) {
  const failed = attempt.status === "failed";
  const score = feedback?.overallScore ?? attempt.score ?? 0;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-4">
      <Panel
        title={attempt.title}
        sub={failed ? "Failed" : "Done"}
        danger={failed}
      >
        <div className="px-4 py-6 sm:px-6">
          {notice ? (
            <p className="mb-4 border border-hazard px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-hazard">
              {notice}
            </p>
          ) : null}

          <div className="flex flex-col items-center gap-2 border-y-2 border-foreground py-8">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-dim">
              {failed ? "Result" : "Your score"}
            </p>
            <p
              className={`font-sans text-[clamp(4rem,16vw,8rem)] leading-none ${
                failed ? "text-hazard" : score >= 70 ? "text-phos" : "text-foreground"
              }`}
            >
              {failed ? "X" : score}
            </p>
            {!failed && result ? (
              <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-xs uppercase tracking-[0.2em]">
                <span className="text-phos">+{result.xpAwarded} XP</span>
                <span className="text-foreground">+{result.coinsAwarded} COINS</span>
                <span className="text-dim">Streak: {result.streak.current} days</span>
                {result.level.after > result.level.before ? (
                  <span className="bg-hazard px-2 py-0.5 font-bold text-black">
                    LEVEL {result.level.after}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {result && result.newBadges.length > 0 ? (
            <div className="mt-4 border-2 border-phos bg-phos/5 px-4 py-3">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-phos">
                New badges
              </p>
              <ul className="mt-2 space-y-1">
                {result.newBadges.map((b) => (
                  <li key={b.id} className="font-mono text-xs text-foreground">
                    ▸ <span className="text-phos">{b.name}</span> — {b.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {feedback ? (
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
                  Score breakdown
                </p>
                {feedback.dimensionScores.map((d) => (
                  <div key={d.dimension}>
                    <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.1em]">
                      <span className="text-foreground">{d.dimension}</span>
                      <span className={d.score >= 70 ? "text-phos" : d.score >= 40 ? "text-foreground" : "text-hazard"}>
                        {String(d.score).padStart(3, "0")}
                      </span>
                    </div>
                    <ProgressBar value={d.score} max={100} tone={d.score >= 70 ? "phos" : d.score >= 40 ? "foreground" : "hazard"} />
                    <p className="mt-1 font-mono text-[0.65rem] leading-relaxed text-dim">
                      {d.comment}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-1 bg-line p-[1px] sm:grid-cols-2">
                <div className="bg-paper px-4 py-3">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-phos">
                    What went well
                  </p>
                  <ul className="mt-2 space-y-1">
                    {feedback.strengths.length === 0 ? (
                      <li className="font-mono text-xs text-dim">— none recorded</li>
                    ) : (
                      feedback.strengths.map((s, i) => (
                        <li key={i} className="font-mono text-xs leading-relaxed text-foreground">▸ {s}</li>
                      ))
                    )}
                  </ul>
                </div>
                <div className="bg-paper px-4 py-3">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-hazard">
                    Improve next time
                  </p>
                  <ul className="mt-2 space-y-1">
                    {feedback.improvements.length === 0 ? (
                      <li className="font-mono text-xs text-dim">— none recorded</li>
                    ) : (
                      feedback.improvements.map((s, i) => (
                        <li key={i} className="font-mono text-xs leading-relaxed text-foreground">▸ {s}</li>
                      ))
                    )}
                  </ul>
                </div>
              </div>

              <div className="border-2 border-line bg-paper px-4 py-3">
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
                  Feedback
                </p>
                <p className="mt-2 font-mono text-sm leading-relaxed text-foreground">
                  {feedback.summary}
                </p>
                {feedback.nextChallenge ? (
                  <p className="mt-3 font-mono text-xs leading-relaxed text-dim">
                    Next idea: {feedback.nextChallenge}
                  </p>
                ) : null}
                {!feedback.aiGenerated && !failed && attempt.submissionType !== "quiz" ? (
                  <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-dim">
                    Basic scoring was used (AI unavailable).
                  </p>
                ) : null}
              </div>
            </div>
          ) : failed ? (
            <p className="mt-6 text-center font-mono text-sm uppercase tracking-[0.15em] text-dim">
              Time ran out. Try another challenge when you&apos;re ready.
            </p>
          ) : null}

          {attempt.payload?.quiz && attempt.payload.quiz.some((q) => q.answer !== -1) ? (
            <div className="mt-6">
              <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.25em] text-dim">
                Answer review
              </p>
              <ol className="space-y-2">
                {attempt.payload.quiz.map((q, i) => {
                  const mine = userAnswers[i];
                  const correct =
                    typeof q.answer === "number"
                      ? q.options?.[q.answer]
                      : String(q.answer);
                  const wasRight =
                    typeof q.answer === "number"
                      ? mine !== undefined && Number(mine) === q.answer
                      : mine !== undefined &&
                        String(mine).trim().toLowerCase() ===
                          String(q.answer).trim().toLowerCase();
                  return (
                    <li key={i} className={`border px-3 py-2 ${wasRight ? "border-line" : "border-hazard"}`}>
                      <p className="font-mono text-xs text-foreground">
                        {i + 1}. {q.question}
                      </p>
                      <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-[0.1em]">
                        <span className={wasRight ? "text-phos" : "text-hazard"}>
                          {wasRight ? "Correct" : "Wrong"}
                        </span>{" "}
                        <span className="text-dim">· Answer: {correct}</span>
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}

          <div className="mt-8 grid gap-1 sm:grid-cols-2">
            <Link
              href="/challenges"
              className="border-2 border-foreground bg-hazard px-4 py-3 text-center font-sans text-lg uppercase tracking-wide text-black transition-colors hover:bg-foreground hover:text-background"
            >
              New challenge
            </Link>
            <Link
              href="/dashboard"
              className="border-2 border-foreground bg-background px-4 py-3 text-center font-sans text-lg uppercase tracking-wide text-foreground transition-colors hover:border-hazard hover:text-hazard"
            >
              Home
            </Link>
          </div>
        </div>
      </Panel>
    </main>
  );
}
