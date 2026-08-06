import { NextResponse } from "next/server";
import { getEnv, requireUserId } from "@/lib/auth";
import { dailyCategoryId } from "@/lib/challenges/registry";
import {
  createAttempt,
  getEnabledCategoryIds,
  listAttempts,
  sanitizeAttempt,
} from "@/lib/challenges/service";
import type { Difficulty } from "@/lib/challenges/types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const MAX_IN_FLIGHT = 5;

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const env = await getEnv();
  const attempts = await listAttempts(env.DB, authResult.userId, [
    "not_started",
    "preparing",
    "active",
    "evaluating",
  ]);
  return NextResponse.json({ attempts: attempts.map(sanitizeAttempt) });
}

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as {
    categoryId?: string;
    difficulty?: string;
    isDaily?: boolean;
  };

  const difficulty = body.difficulty as Difficulty;
  if (!body.categoryId || !DIFFICULTIES.includes(difficulty)) {
    return NextResponse.json(
      { error: "categoryId and difficulty (easy|medium|hard) are required" },
      { status: 400 },
    );
  }

  const env = await getEnv();
  const enabled = await getEnabledCategoryIds(env.DB);
  if (!enabled.includes(body.categoryId)) {
    return NextResponse.json(
      { error: "Unknown or disabled category" },
      { status: 400 },
    );
  }

  const isDaily = body.isDaily === true;
  if (isDaily && body.categoryId !== dailyCategoryId(new Date())) {
    return NextResponse.json(
      { error: "That is not today's daily challenge category" },
      { status: 400 },
    );
  }

  const inFlight = await listAttempts(env.DB, authResult.userId, [
    "not_started",
    "preparing",
    "active",
  ]);
  if (inFlight.length >= MAX_IN_FLIGHT) {
    return NextResponse.json(
      { error: "Too many open challenges — finish or abandon one first" },
      { status: 409 },
    );
  }

  const attempt = await createAttempt(
    env,
    authResult.userId,
    body.categoryId,
    difficulty,
    isDaily,
  );
  return NextResponse.json({ attempt: sanitizeAttempt(attempt) }, { status: 201 });
}
