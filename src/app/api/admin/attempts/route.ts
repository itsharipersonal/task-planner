import { NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  let where = "WHERE 1=1";
  const binds: (string | number)[] = [];

  if (status) {
    where += " AND a.status = ?";
    binds.push(status);
  }
  if (category) {
    where += " AND a.category_id = ?";
    binds.push(category);
  }

  const { results } = await admin.env.DB.prepare(
    `SELECT a.id, a.user_id, a.title, a.category_id, a.difficulty, a.status, a.score,
            a.created_at, a.submitted_at, a.completed_at,
            COALESCE(u.name, u.email, a.user_id) AS user_name
     FROM challenge_attempts a
     LEFT JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
  )
    .bind(...binds, limit, offset)
    .all();

  return NextResponse.json({ attempts: results ?? [] });
}
