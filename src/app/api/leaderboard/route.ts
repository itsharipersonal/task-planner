import { NextResponse } from "next/server";
import { getEnv, requireUserId } from "@/lib/auth";
import { getLeaderboard } from "@/lib/challenges/service";

export async function GET(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const scope =
    new URL(request.url).searchParams.get("scope") === "weekly"
      ? ("weekly" as const)
      : ("global" as const);

  const env = await getEnv();
  const entries = await getLeaderboard(env.DB, authResult.userId, scope);
  return NextResponse.json({ scope, entries });
}
