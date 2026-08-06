import { NextResponse } from "next/server";
import { getEnv, requireUserId } from "@/lib/auth";
import { getProfileData } from "@/lib/challenges/service";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const env = await getEnv();
  const data = await getProfileData(env, authResult.userId);
  return NextResponse.json(data);
}
