import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { computeCoins, computeXpAward } from "@/lib/gamification";
import { getCategory } from "@/lib/challenges/registry";
import { requireModerator } from "@/lib/auth";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const db = admin.env.DB;

  const attempt = await db
    .prepare("SELECT * FROM challenge_attempts WHERE id = ?")
    .bind(id)
    .first();
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [submission, feedback] = await Promise.all([
    db.prepare("SELECT * FROM challenge_submissions WHERE attempt_id = ?").bind(id).first(),
    db.prepare("SELECT * FROM challenge_feedback WHERE attempt_id = ?").bind(id).first(),
  ]);

  return NextResponse.json({ attempt, submission, feedback });
}

/** Admin score override with XP recalculation. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    score?: number;
    notes?: string;
  };

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
      `SELECT id, user_id, title, status, category_id, difficulty, is_daily, xp_awarded
       FROM challenge_attempts WHERE id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      user_id: string;
      title: string;
      status: string;
      category_id: string;
      difficulty: string;
      is_daily: number;
      xp_awarded: number | null;
    }>();

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (attempt.status !== "completed" && attempt.status !== "submitted") {
    return NextResponse.json(
      { error: "Only submitted or completed attempts can be reviewed" },
      { status: 409 },
    );
  }

  const category = getCategory(attempt.category_id);
  const newXp = category
    ? computeXpAward(
        category.xpReward,
        attempt.difficulty as "easy" | "medium" | "hard",
        score,
        attempt.is_daily === 1,
      )
    : Math.max(5, Math.round(score / 10));
  const oldXp = attempt.xp_awarded ?? 0;
  const xpDelta = newXp - oldXp;
  const newCoins = computeCoins(newXp);
  const coinDelta = newCoins - computeCoins(oldXp);

  const summaryNote = body.notes
    ? `${body.notes} (admin review)`
    : "Score adjusted by admin review.";

  await db.batch([
    db.prepare(
      "UPDATE challenge_attempts SET score = ?, xp_awarded = ?, status = 'completed', updated_at = datetime('now') WHERE id = ?",
    ).bind(score, newXp, id),
    db.prepare(
      "UPDATE challenge_feedback SET overall_score = ?, overridden_by = ?, summary = ? WHERE attempt_id = ?",
    ).bind(score, admin.email, summaryNote, id),
    db.prepare(
      "UPDATE user_progress SET xp = MAX(0, xp + ?), coins = MAX(0, coins + ?), updated_at = datetime('now') WHERE user_id = ?",
    ).bind(xpDelta, coinDelta, attempt.user_id),
    db.prepare(
      "INSERT INTO xp_history (id, user_id, attempt_id, amount, reason) VALUES (?, ?, ?, ?, ?)",
    ).bind(
      crypto.randomUUID(),
      attempt.user_id,
      id,
      xpDelta,
      `Admin score override (${oldXp} → ${newXp} XP)`,
    ),
    db.prepare(
      "INSERT INTO notifications (id, user_id, type, title, body, link) VALUES (?, ?, 'score_review', 'SCORE REVIEWED', ?, ?)",
    ).bind(
      crypto.randomUUID(),
      attempt.user_id,
      `An admin reviewed "${attempt.title}" and set the score to ${score}.`,
      `/challenges/${id}`,
    ),
  ]);

  await logAdminAction(db, {
    adminId: admin.userId,
    action: "override_score",
    module: "attempts",
    resourceId: id,
    metadata: { score, xpDelta, notes: body.notes },
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true, score, xpAwarded: newXp, xpDelta });
}
