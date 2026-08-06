import { NextResponse } from "next/server";
import { getEnv, requireUserId } from "@/lib/auth";
import { getAttempt, submitAttempt } from "@/lib/challenges/service";
import type { SubmissionInput } from "@/lib/challenges/types";

const MAX_TEXT_LENGTH = 60_000;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await ctx.params;
  const env = await getEnv();
  const attempt = await getAttempt(env.DB, authResult.userId, id);
  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (attempt.status === "failed") {
    return NextResponse.json(
      { error: "The deadline passed — this challenge is marked failed." },
      { status: 410 },
    );
  }
  if (attempt.status !== "active") {
    return NextResponse.json(
      { error: `Cannot submit while the challenge is ${attempt.status}` },
      { status: 409 },
    );
  }

  const body = (await request.json()) as SubmissionInput;
  const submission: SubmissionInput = {
    text:
      typeof body.text === "string"
        ? body.text.slice(0, MAX_TEXT_LENGTH)
        : undefined,
    answers: Array.isArray(body.answers) ? body.answers.slice(0, 100) : undefined,
    url: typeof body.url === "string" ? body.url.slice(0, 2000) : undefined,
    durationSeconds:
      typeof body.durationSeconds === "number" && body.durationSeconds >= 0
        ? Math.round(body.durationSeconds)
        : undefined,
  };

  const result = await submitAttempt(env, attempt, submission);
  return NextResponse.json(result);
}
