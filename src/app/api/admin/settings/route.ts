import { NextResponse } from "next/server";
import { getClientIp, getSetting, logAdminAction, setSetting } from "@/lib/admin/audit";
import { requireSuperAdmin } from "@/lib/auth";

const SETTING_KEYS = [
  "platform_name",
  "maintenance_mode",
  "registration_enabled",
  "daily_challenge_enabled",
  "xp_multiplier",
  "coin_multiplier",
  "max_daily_xp",
  "max_streak_bonus",
  "weekly_reset_enabled",
  "leaderboard_visibility",
  "openrouter_model",
  "openrouter_temperature",
  "openrouter_max_tokens",
];

export async function GET() {
  const admin = await requireSuperAdmin();
  if ("error" in admin) return admin.error;

  const db = admin.env.DB;
  const settings: Record<string, string> = {};
  for (const key of SETTING_KEYS) {
    settings[key] = await getSetting(db, key, "");
  }

  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as Record<string, string | boolean | number>;
  const db = admin.env.DB;

  for (const [key, value] of Object.entries(body)) {
    if (!SETTING_KEYS.includes(key)) continue;
    const stored = typeof value === "string" ? value : JSON.stringify(value);
    await setSetting(db, key, stored, admin.userId);
  }

  await logAdminAction(db, {
    adminId: admin.userId,
    action: "update_settings",
    module: "settings",
    metadata: body as Record<string, unknown>,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
