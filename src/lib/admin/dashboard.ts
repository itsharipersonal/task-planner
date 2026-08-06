export type DashboardTotals = {
  users: number;
  active_today: number;
  attempts: number;
  completed: number;
  failed: number;
  avg_score: number | null;
  xp_today: number;
  coins_today: number;
  active_challenges: number;
  pending_reviews: number;
};

export async function getDashboardTotals(db: D1Database): Promise<DashboardTotals> {
  const row = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE status != 'deleted') AS users,
        (SELECT COUNT(DISTINCT user_id) FROM challenge_attempts
          WHERE date(created_at) = date('now')) AS active_today,
        (SELECT COUNT(*) FROM challenge_attempts) AS attempts,
        (SELECT COUNT(*) FROM challenge_attempts WHERE status = 'completed') AS completed,
        (SELECT COUNT(*) FROM challenge_attempts WHERE status = 'failed') AS failed,
        (SELECT ROUND(AVG(score)) FROM challenge_attempts WHERE status = 'completed') AS avg_score,
        (SELECT COALESCE(SUM(amount), 0) FROM xp_history WHERE date(created_at) = date('now')) AS xp_today,
        (SELECT COALESCE(SUM(xp_awarded), 0) FROM challenge_attempts
          WHERE status = 'completed' AND date(completed_at / 1000, 'unixepoch') = date('now')) AS xp_from_attempts,
        (SELECT COUNT(*) FROM challenge_attempts
          WHERE status IN ('preparing', 'active', 'submitted', 'evaluating')) AS active_challenges,
        (SELECT COUNT(*) FROM challenge_attempts WHERE status = 'submitted') AS pending_reviews`,
    )
    .first<{
      users: number;
      active_today: number;
      attempts: number;
      completed: number;
      failed: number;
      avg_score: number | null;
      xp_today: number;
      xp_from_attempts: number;
      active_challenges: number;
      pending_reviews: number;
    }>();

  const coinsToday = await db
    .prepare(
      `SELECT COALESCE(SUM(coins), 0) AS coins FROM user_progress
       WHERE date(updated_at) = date('now')`,
    )
    .first<{ coins: number }>();

  return {
    users: row?.users ?? 0,
    active_today: row?.active_today ?? 0,
    attempts: row?.attempts ?? 0,
    completed: row?.completed ?? 0,
    failed: row?.failed ?? 0,
    avg_score: row?.avg_score ?? null,
    xp_today: row?.xp_today ?? row?.xp_from_attempts ?? 0,
    coins_today: coinsToday?.coins ?? 0,
    active_challenges: row?.active_challenges ?? 0,
    pending_reviews: row?.pending_reviews ?? 0,
  };
}

export async function getDailyActiveUsers(db: D1Database, days = 14) {
  const { results } = await db
    .prepare(
      `SELECT date(created_at) AS day, COUNT(DISTINCT user_id) AS count
       FROM challenge_attempts
       WHERE created_at >= date('now', '-' || ? || ' days')
       GROUP BY date(created_at)
       ORDER BY day`,
    )
    .bind(days)
    .all();
  return (results ?? []) as { day: string; count: number }[];
}

export async function getChallengeCompletion(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT status, COUNT(*) AS count
       FROM challenge_attempts
       GROUP BY status`,
    )
    .all();
  return (results ?? []) as { status: string; count: number }[];
}

export async function getXpDistribution(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT
        CASE
          WHEN xp < 100 THEN '0-99'
          WHEN xp < 500 THEN '100-499'
          WHEN xp < 1000 THEN '500-999'
          WHEN xp < 2500 THEN '1000-2499'
          ELSE '2500+'
        END AS bucket,
        COUNT(*) AS count
       FROM user_progress
       GROUP BY bucket
       ORDER BY MIN(xp)`,
    )
    .all();
  return (results ?? []) as { bucket: string; count: number }[];
}

export async function getTopCategories(db: D1Database, limit = 8) {
  const { results } = await db
    .prepare(
      `SELECT category_id, COUNT(*) AS count
       FROM challenge_attempts
       WHERE status = 'completed'
       GROUP BY category_id
       ORDER BY count DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all();
  return (results ?? []) as { category_id: string; count: number }[];
}

export async function getUserGrowth(db: D1Database, months = 6) {
  const { results } = await db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
       FROM users
       WHERE created_at >= date('now', '-' || ? || ' months')
       GROUP BY month
       ORDER BY month`,
    )
    .bind(months)
    .all();
  return (results ?? []) as { month: string; count: number }[];
}

export async function getRecentAttempts(db: D1Database, limit = 25) {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.title, a.category_id, a.difficulty, a.status, a.score, a.created_at,
              COALESCE(u.name, u.email, a.user_id) AS user_name
       FROM challenge_attempts a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all();
  return results ?? [];
}

export async function getCategoryStats(db: D1Database) {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.enabled, c.sort_order, c.name, c.status,
              (SELECT COUNT(*) FROM challenge_attempts a WHERE a.category_id = c.id) AS attempts
       FROM challenge_categories c
       ORDER BY c.sort_order`,
    )
    .all();
  return results ?? [];
}
