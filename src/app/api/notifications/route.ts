import { NextResponse } from "next/server";
import { getEnv, requireUserId } from "@/lib/auth";
import {
  getNotifications,
  markNotificationsRead,
} from "@/lib/challenges/service";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const env = await getEnv();
  const notifications = await getNotifications(env.DB, authResult.userId);
  return NextResponse.json({ notifications });
}

export async function POST() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const env = await getEnv();
  await markNotificationsRead(env.DB, authResult.userId);
  return NextResponse.json({ ok: true });
}
