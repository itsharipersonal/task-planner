import { NextResponse } from "next/server";
import { getEnv, requireUserId } from "@/lib/auth";
import { failAttempt, getAttempt } from "@/lib/challenges/service";

export async function POST(
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
  if (attempt.status === "completed" || attempt.status === "failed") {
    return NextResponse.json({ attempt });
  }

  const updated = await failAttempt(env.DB, attempt, "Abandoned by operator.");
  return NextResponse.json({ attempt: updated });
}
