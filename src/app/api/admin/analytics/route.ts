import { NextResponse } from "next/server";
import {
  getAiAnalytics,
  getCategoryAnalytics,
  getChallengeAnalytics,
  getGamificationAnalytics,
  getUserAnalytics,
} from "@/lib/admin/analytics";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const db = admin.env.DB;
  const [users, challenges, categories, ai, gamification] = await Promise.all([
    getUserAnalytics(db),
    getChallengeAnalytics(db),
    getCategoryAnalytics(db),
    getAiAnalytics(db),
    getGamificationAnalytics(db),
  ]);

  return NextResponse.json({ users, challenges, categories, ai, gamification });
}
