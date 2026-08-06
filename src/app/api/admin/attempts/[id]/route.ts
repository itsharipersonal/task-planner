import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

/** Admin score override: adjusts the attempt score and records who did it. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as { score?: number };
  if (
    typeof body.score !== "number" ||
    body.score < 0 ||
    body.score > 100
  ) {
    return NextResponse.json(
      { error: "score (0-100) required" },
      { status: 400 },
    );
  }
  const score = Math.round(body.score);
  const db = admin.env.DB;

  const attempt = await db
    .prepare(
      "SELECT id, user_id, title, status FROM challenge_attempts WHERE id = ?",
    )
    .bind(id)
    .first<{ id: string; user_id: string; title: string; status: string }>();
  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (attempt.status !== "completed") {
    return NextResponse.json(
      { error: "Only completed attempts can have their score overridden" },
      { status: 409 },
    );
  }

  await db.batch([
    db.prepare("UPDATE challenge_attempts SET score = ?, updated_at = datetime('now') WHERE id = ?").bind(score, id),
    db.prepare(
        "UPDATE challenge_feedback SET overall_score = ?, overridden_by = ? WHERE attempt_id = ?",
      )
      .bind(score, admin.email, id),
    db.prepare(
        "INSERT INTO notifications (id, user_id, type, title, body, link) VALUES (?, ?, 'score_review', 'SCORE REVIEWED', ?, ?)",
      )
      .bind(
        crypto.randomUUID(),
        attempt.user_id,
        `An admin reviewed "${attempt.title}" and set the score to ${score}.`,
        `/challenges/${id}`,
      ),
  ]);

  return NextResponse.json({ ok: true, score });
}
