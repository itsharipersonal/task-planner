import { NextResponse } from "next/server";
import {
  getCategoryStats,
  getChallengeCompletion,
  getDailyActiveUsers,
  getDashboardTotals,
  getRecentAttempts,
  getTopCategories,
  getUserGrowth,
  getXpDistribution,
} from "@/lib/admin/dashboard";
import { requireModerator } from "@/lib/auth";

export async function GET() {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const db = admin.env.DB;
  const [
    totals,
    dau,
    completion,
    xpDistribution,
    topCategories,
    userGrowth,
    recentAttempts,
    categories,
  ] = await Promise.all([
    getDashboardTotals(db),
    getDailyActiveUsers(db),
    getChallengeCompletion(db),
    getXpDistribution(db),
    getTopCategories(db),
    getUserGrowth(db),
    getRecentAttempts(db),
    getCategoryStats(db),
  ]);

  return NextResponse.json({
    totals,
    charts: { dau, completion, xpDistribution, topCategories, userGrowth },
    recentAttempts,
    categories,
  });
}
