import { NextResponse } from "next/server";
import {
  getCategoryStats,
  getDashboardTotals,
  getRecentAttempts,
} from "@/lib/admin/dashboard";
import { requireModerator } from "@/lib/auth";

export async function GET() {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const db = admin.env.DB;
  const [totals, recentAttempts, categories] = await Promise.all([
    getDashboardTotals(db),
    getRecentAttempts(db),
    getCategoryStats(db),
  ]);

  return NextResponse.json({ totals, recentAttempts, categories });
}
