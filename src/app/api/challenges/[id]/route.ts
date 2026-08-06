import { NextResponse } from "next/server";
import { getEnv, requireUserId } from "@/lib/auth";
import {
  getAttempt,
  getFeedback,
  sanitizeAttempt,
} from "@/lib/challenges/service";

export async function GET(
  _request: Request,
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

  const finished = attempt.status === "completed" || attempt.status === "failed";
  const feedback = finished ? await getFeedback(env.DB, attempt.id) : null;

  return NextResponse.json({
    attempt: sanitizeAttempt(attempt),
    feedback,
    serverNow: Date.now(),
  });
}
