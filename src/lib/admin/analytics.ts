export async function getUserAnalytics(db: D1Database) {
  const totals = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE status = 'active') AS total,
        (SELECT COUNT(*) FROM users WHERE date(created_at) >= date('now', '-7 days')) AS new_week,
        (SELECT COUNT(DISTINCT user_id) FROM challenge_attempts
          WHERE date(created_at) >= date('now', '-7 days')) AS returning_week`,
    )
    .first();
  return totals;
}

export async function getChallengeAnalytics(db: D1Database) {
  const row = await db
    .prepare(
      `SELECT
        COUNT(*) AS total_attempts,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
        ROUND(AVG(CASE WHEN status = 'completed' THEN score END)) AS avg_score
       FROM challenge_attempts`,
    )
    .first<{
      total_attempts: number;
      completed: number;
      failed: number;
      avg_score: number | null;
    }>();
  const total = row?.total_attempts ?? 0;
  const completed = row?.completed ?? 0;
  return {
    ...row,
    completion_rate: total ? Math.round((completed / total) * 100) : 0,
    failure_rate: total ? Math.round(((row?.failed ?? 0) / total) * 100) : 0,
  };
}

export async function getCategoryAnalytics(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT category_id,
              COUNT(*) AS attempts,
              ROUND(AVG(CASE WHEN status = 'completed' THEN score END)) AS avg_score
       FROM challenge_attempts
       GROUP BY category_id
       ORDER BY attempts DESC`,
    )
    .all();
  return results ?? [];
}

export async function getAiAnalytics(db: D1Database) {
  const row = await db
    .prepare(
      `SELECT
        ROUND(AVG(f.overall_score)) AS avg_ai_score,
        (SELECT COUNT(*) FROM challenge_feedback WHERE overridden_by IS NOT NULL) AS override_count,
        (SELECT COUNT(*) FROM challenge_attempts WHERE ai_generated = 1) AS ai_attempts
       FROM challenge_feedback f`,
    )
    .first();
  return row;
}

export async function getGamificationAnalytics(db: D1Database) {
  const row = await db
    .prepare(
      `SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM xp_history) AS xp_generated,
        (SELECT COALESCE(SUM(coins), 0) FROM user_progress) AS coins_total,
        (SELECT COUNT(*) FROM user_badges) AS badges_earned,
        (SELECT ROUND(AVG(current_streak)) FROM user_streaks WHERE current_streak > 0) AS avg_streak
       FROM user_progress LIMIT 1`,
    )
    .first();
  return row;
}
