import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;
  const db = admin.env.DB;

  const totals = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM challenge_attempts) AS attempts,
        (SELECT COUNT(*) FROM challenge_attempts WHERE status = 'completed') AS completed,
        (SELECT COUNT(*) FROM challenge_attempts WHERE status = 'failed') AS failed,
        (SELECT ROUND(AVG(score)) FROM challenge_attempts WHERE status = 'completed') AS avg_score`,
    )
    .first();

  const { results: recentAttempts } = await db
    .prepare(
      `SELECT a.id, a.title, a.category_id, a.difficulty, a.status, a.score, a.created_at,
              COALESCE(u.name, u.email, a.user_id) AS user_name
       FROM challenge_attempts a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 25`,
    )
    .all();

  const { results: categories } = await db
    .prepare(
      `SELECT c.id, c.enabled, c.sort_order,
              (SELECT COUNT(*) FROM challenge_attempts a WHERE a.category_id = c.id) AS attempts
       FROM challenge_categories c ORDER BY c.sort_order`,
    )
    .all();

  return NextResponse.json({
    totals,
    recentAttempts: recentAttempts ?? [],
    categories: categories ?? [],
  });
}
