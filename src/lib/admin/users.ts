import { levelForXp } from "@/lib/gamification";
import type { UserRole, UserStatus } from "@/types/admin";

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  xp: number;
  coins: number;
  current_streak: number;
  total_completed: number;
};

export async function listUsers(
  db: D1Database,
  opts: { q?: string; role?: string; status?: string; limit?: number; offset?: number } = {},
) {
  const limit = opts.limit ?? 25;
  const offset = opts.offset ?? 0;
  let where = "WHERE u.status != 'deleted'";
  const binds: (string | number)[] = [];

  if (opts.q) {
    where += " AND (LOWER(u.email) LIKE ? OR LOWER(u.name) LIKE ?)";
    const term = `%${opts.q.toLowerCase()}%`;
    binds.push(term, term);
  }
  if (opts.role) {
    where += " AND u.role = ?";
    binds.push(opts.role);
  }
  if (opts.status) {
    where += " AND u.status = ?";
    binds.push(opts.status);
  }

  const countRow = await db
    .prepare(`SELECT COUNT(*) AS total FROM users u ${where}`)
    .bind(...binds)
    .first<{ total: number }>();

  const { results } = await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.image, u.role, u.status, u.created_at,
              COALESCE(p.xp, 0) AS xp, COALESCE(p.coins, 0) AS coins,
              COALESCE(p.total_completed, 0) AS total_completed,
              COALESCE(s.current_streak, 0) AS current_streak
       FROM users u
       LEFT JOIN user_progress p ON p.user_id = u.id
       LEFT JOIN user_streaks s ON s.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...binds, limit, offset)
    .all<AdminUserRow>();

  return {
    users: (results ?? []).map((u) => ({
      ...u,
      level: levelForXp(u.xp),
    })),
    total: countRow?.total ?? 0,
  };
}

export async function getUserDetail(db: D1Database, userId: string) {
  const user = await db
    .prepare(
      `SELECT u.id, u.name, u.email, u.image, u.role, u.status, u.created_at, u.updated_at,
              COALESCE(p.xp, 0) AS xp, COALESCE(p.coins, 0) AS coins,
              COALESCE(p.total_completed, 0) AS total_completed,
              COALESCE(p.total_failed, 0) AS total_failed,
              COALESCE(s.current_streak, 0) AS current_streak,
              COALESCE(s.longest_streak, 0) AS longest_streak
       FROM users u
       LEFT JOIN user_progress p ON p.user_id = u.id
       LEFT JOIN user_streaks s ON s.user_id = u.id
       WHERE u.id = ?`,
    )
    .bind(userId)
    .first();

  if (!user) return null;

  const [attempts, xpHistory, badges] = await Promise.all([
    db
      .prepare(
        "SELECT id, title, category_id, status, score, created_at FROM challenge_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        "SELECT id, amount, reason, created_at FROM xp_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        "SELECT badge_id, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC",
      )
      .bind(userId)
      .all(),
  ]);

  return {
    user: { ...user, level: levelForXp((user as { xp: number }).xp) },
    attempts: attempts.results ?? [],
    xpHistory: xpHistory.results ?? [],
    badges: badges.results ?? [],
  };
}
