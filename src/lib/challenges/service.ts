import { evaluateSubmission, generateChallenge, scoreQuiz } from "../ai";
import {
  BADGES,
  computeCoins,
  computeXpAward,
  levelForXp,
  levelProgress,
  nextStreak,
  utcDateString,
} from "../gamification";
import {
  CATEGORY_REGISTRY,
  dailyCategoryId,
  getCategory,
  type CategoryConfig,
} from "./registry";
import type {
  Attempt,
  AttemptStatus,
  ChallengePayload,
  Difficulty,
  Evaluation,
  GeneratedChallenge,
  SubmissionInput,
} from "./types";

const GRACE_MS = 15_000;

type AttemptRow = {
  id: string;
  user_id: string;
  category_id: string;
  template_id: string | null;
  title: string;
  description: string;
  instructions: string;
  difficulty: string;
  submission_type: string;
  prep_seconds: number;
  work_seconds: number;
  payload: string | null;
  status: string;
  is_daily: number;
  ai_generated: number;
  prep_ends_at: number | null;
  work_ends_at: number | null;
  submitted_at: number | null;
  completed_at: number | null;
  score: number | null;
  xp_awarded: number | null;
  created_at: string;
};

const ATTEMPT_COLUMNS =
  "id, user_id, category_id, template_id, title, description, instructions, difficulty, submission_type, prep_seconds, work_seconds, payload, status, is_daily, ai_generated, prep_ends_at, work_ends_at, submitted_at, completed_at, score, xp_awarded, created_at";

function rowToAttempt(row: AttemptRow): Attempt {
  return {
    id: row.id,
    userId: row.user_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    difficulty: row.difficulty as Difficulty,
    submissionType: row.submission_type as Attempt["submissionType"],
    prepSeconds: row.prep_seconds,
    workSeconds: row.work_seconds,
    payload: row.payload ? (JSON.parse(row.payload) as ChallengePayload) : null,
    status: row.status as AttemptStatus,
    isDaily: row.is_daily === 1,
    aiGenerated: row.ai_generated === 1,
    prepEndsAt: row.prep_ends_at,
    workEndsAt: row.work_ends_at,
    submittedAt: row.submitted_at,
    completedAt: row.completed_at,
    score: row.score,
    xpAwarded: row.xp_awarded,
    createdAt: row.created_at,
  };
}

/** Correct answers must never reach the client while a quiz is running. */
export function sanitizeAttempt(attempt: Attempt): Attempt {
  if (!attempt.payload?.quiz) return attempt;
  const finished = attempt.status === "completed" || attempt.status === "failed";
  if (finished) return attempt;
  return {
    ...attempt,
    payload: {
      ...attempt.payload,
      quiz: attempt.payload.quiz.map((q) => ({ ...q, answer: -1 })),
    },
  };
}

async function createNotification(
  db: D1Database,
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  await db
    .prepare(
      "INSERT INTO notifications (id, user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(crypto.randomUUID(), userId, type, title, body, link ?? null)
    .run();
}

async function ensureProgress(db: D1Database, userId: string) {
  await db
    .prepare("INSERT OR IGNORE INTO user_progress (user_id) VALUES (?)")
    .bind(userId)
    .run();
  await db
    .prepare("INSERT OR IGNORE INTO user_streaks (user_id) VALUES (?)")
    .bind(userId)
    .run();
}

/**
 * Enforces timers server-side. Prep over → the work clock was already running.
 * Work deadline (+grace) passed without a submission → the attempt fails and
 * the failure is recorded. This is the accountability part: walking away is a
 * result, not a pause.
 */
async function reconcile(db: D1Database, attempt: Attempt): Promise<Attempt> {
  const now = Date.now();

  if (
    attempt.status === "preparing" &&
    attempt.prepEndsAt !== null &&
    now > attempt.prepEndsAt
  ) {
    const workEndsAt = attempt.prepEndsAt + attempt.workSeconds * 1000;
    await db
      .prepare(
        "UPDATE challenge_attempts SET status = 'active', work_ends_at = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(workEndsAt, attempt.id)
      .run();
    attempt = { ...attempt, status: "active", workEndsAt };
  }

  if (
    attempt.status === "active" &&
    attempt.workEndsAt !== null &&
    now > attempt.workEndsAt + GRACE_MS
  ) {
    attempt = await failAttempt(db, attempt, "Time expired before submission.");
  }

  return attempt;
}

export async function failAttempt(
  db: D1Database,
  attempt: Attempt,
  reason: string,
): Promise<Attempt> {
  await ensureProgress(db, attempt.userId);
  await db.batch([
    db.prepare(
        "UPDATE challenge_attempts SET status = 'failed', completed_at = ?, score = 0, xp_awarded = 0, updated_at = datetime('now') WHERE id = ? AND status NOT IN ('completed','failed')",
      )
      .bind(Date.now(), attempt.id),
    db.prepare(
        "UPDATE user_progress SET total_failed = total_failed + 1, updated_at = datetime('now') WHERE user_id = ?",
      )
      .bind(attempt.userId),
  ]);
  await createNotification(
    db,
    attempt.userId,
    "challenge_failed",
    "CHALLENGE FAILED",
    `"${attempt.title}" — ${reason}`,
    `/challenges/${attempt.id}`,
  );
  return { ...attempt, status: "failed", score: 0, xpAwarded: 0 };
}

export async function getAttempt(
  db: D1Database,
  userId: string,
  id: string,
): Promise<Attempt | null> {
  const row = await db
    .prepare(
      `SELECT ${ATTEMPT_COLUMNS} FROM challenge_attempts WHERE id = ? AND user_id = ?`,
    )
    .bind(id, userId)
    .first<AttemptRow>();
  if (!row) return null;
  return reconcile(db, rowToAttempt(row));
}

export async function listAttempts(
  db: D1Database,
  userId: string,
  statuses: AttemptStatus[],
  limit = 20,
): Promise<Attempt[]> {
  const placeholders = statuses.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT ${ATTEMPT_COLUMNS} FROM challenge_attempts WHERE user_id = ? AND status IN (${placeholders}) ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(userId, ...statuses, limit)
    .all<AttemptRow>();
  const attempts: Attempt[] = [];
  for (const row of results ?? []) {
    attempts.push(await reconcile(db, rowToAttempt(row)));
  }
  return attempts;
}

export async function getEnabledCategoryIds(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare(
      "SELECT id FROM challenge_categories WHERE enabled = 1 ORDER BY sort_order",
    )
    .all<{ id: string }>();
  return (results ?? []).map((r) => r.id).filter((id) => id in CATEGORY_REGISTRY);
}

async function pickAdminTemplate(
  db: D1Database,
  categoryId: string,
  difficulty: Difficulty,
): Promise<{ id: string; challenge: GeneratedChallenge } | null> {
  const { results } = await db
    .prepare(
      "SELECT id, title, description, instructions, payload FROM challenge_templates WHERE category_id = ? AND difficulty = ? AND enabled = 1",
    )
    .bind(categoryId, difficulty)
    .all<{
      id: string;
      title: string;
      description: string;
      instructions: string;
      payload: string | null;
    }>();
  if (!results || results.length === 0) return null;
  const row = results[Math.floor(Math.random() * results.length)];
  return {
    id: row.id,
    challenge: {
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      payload: row.payload
        ? (JSON.parse(row.payload) as ChallengePayload)
        : undefined,
    },
  };
}

export async function createAttempt(
  env: CloudflareEnv,
  userId: string,
  categoryId: string,
  difficulty: Difficulty,
  isDaily: boolean,
): Promise<Attempt> {
  const config = getCategory(categoryId);
  if (!config) throw new Error(`Unknown category: ${categoryId}`);
  const db = env.DB;

  const { results: recent } = await db
    .prepare(
      "SELECT title FROM challenge_attempts WHERE user_id = ? AND category_id = ? ORDER BY created_at DESC LIMIT 10",
    )
    .bind(userId, categoryId)
    .all<{ title: string }>();
  const recentTitles = (recent ?? []).map((r) => r.title);

  let generated = await generateChallenge(env, config, difficulty, recentTitles);
  let templateId: string | null = null;

  // If the AI was unavailable, prefer admin-authored templates over the
  // built-in fallback pool (skip templates the user has already seen).
  if (!generated.aiGenerated && !config.generateLocal) {
    const template = await pickAdminTemplate(db, categoryId, difficulty);
    if (template && !recentTitles.includes(template.challenge.title)) {
      generated = { challenge: template.challenge, aiGenerated: false };
      templateId = template.id;
    }
  }

  const id = crypto.randomUUID();
  const { challenge } = generated;
  await db
    .prepare(
      `INSERT INTO challenge_attempts
        (id, user_id, category_id, template_id, title, description, instructions, difficulty, submission_type, prep_seconds, work_seconds, payload, status, is_daily, ai_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?, ?)`,
    )
    .bind(
      id,
      userId,
      categoryId,
      templateId,
      challenge.title,
      challenge.description,
      challenge.instructions,
      difficulty,
      config.submissionType,
      config.prepSeconds[difficulty],
      config.workSeconds[difficulty],
      challenge.payload ? JSON.stringify(challenge.payload) : null,
      isDaily ? 1 : 0,
      generated.aiGenerated ? 1 : 0,
    )
    .run();

  const attempt = await getAttempt(db, userId, id);
  if (!attempt) throw new Error("Failed to create attempt");
  return attempt;
}

export async function startAttempt(
  db: D1Database,
  attempt: Attempt,
): Promise<Attempt> {
  const now = Date.now();

  if (attempt.status === "not_started") {
    if (attempt.prepSeconds > 0) {
      const prepEndsAt = now + attempt.prepSeconds * 1000;
      await db
        .prepare(
          "UPDATE challenge_attempts SET status = 'preparing', prep_ends_at = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(prepEndsAt, attempt.id)
        .run();
      return { ...attempt, status: "preparing", prepEndsAt };
    }
    const workEndsAt = now + attempt.workSeconds * 1000;
    await db
      .prepare(
        "UPDATE challenge_attempts SET status = 'active', work_ends_at = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(workEndsAt, attempt.id)
      .run();
    return { ...attempt, status: "active", workEndsAt };
  }

  if (attempt.status === "preparing") {
    const workEndsAt = now + attempt.workSeconds * 1000;
    await db
      .prepare(
        "UPDATE challenge_attempts SET status = 'active', work_ends_at = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(workEndsAt, attempt.id)
      .run();
    return { ...attempt, status: "active", workEndsAt };
  }

  return attempt;
}

export type SubmissionResult = {
  attempt: Attempt;
  evaluation: Evaluation;
  xpAwarded: number;
  coinsAwarded: number;
  newBadges: { id: string; name: string; description: string }[];
  streak: { current: number; longest: number; extended: boolean };
  level: { before: number; after: number };
};

export async function submitAttempt(
  env: CloudflareEnv,
  attempt: Attempt,
  submission: SubmissionInput,
): Promise<SubmissionResult> {
  const db = env.DB;
  const config = getCategory(attempt.categoryId);
  if (!config) throw new Error(`Unknown category: ${attempt.categoryId}`);
  const now = Date.now();
  const userId = attempt.userId;

  await ensureProgress(db, userId);

  await db
    .prepare(
      "INSERT INTO challenge_submissions (id, attempt_id, user_id, kind, content, duration_seconds) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      crypto.randomUUID(),
      attempt.id,
      userId,
      attempt.submissionType,
      JSON.stringify(submission),
      submission.durationSeconds ?? null,
    )
    .run();

  await db
    .prepare(
      "UPDATE challenge_attempts SET status = 'evaluating', submitted_at = ?, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(now, attempt.id)
    .run();

  let evaluation: Evaluation;
  if (config.autoScored && attempt.payload?.quiz) {
    const result = scoreQuiz(attempt.payload.quiz, submission.answers ?? []);
    evaluation = {
      overallScore: result.overallScore,
      dimensionScores: [
        {
          dimension: config.dimensions[0] ?? "Accuracy",
          score: result.overallScore,
          comment: `${result.correct} of ${result.total} correct.`,
        },
      ],
      strengths:
        result.overallScore >= 80
          ? ["Strong accuracy under time pressure."]
          : result.overallScore >= 50
            ? ["You finished within the time limit."]
            : [],
      improvements:
        result.overallScore < 100
          ? ["Review the questions you missed below and retry at this difficulty."]
          : ["Move up a difficulty level — this one is beaten."],
      summary: `You answered ${result.correct} of ${result.total} correctly for a score of ${result.overallScore}.`,
      nextChallenge: null,
      aiGenerated: false,
    };
  } else {
    evaluation = await evaluateSubmission(env, config, attempt, submission);
  }

  const xpAwarded = computeXpAward(
    config.xpReward,
    attempt.difficulty,
    evaluation.overallScore,
    attempt.isDaily,
  );
  const coinsAwarded = computeCoins(xpAwarded);
  const elapsedSeconds = attempt.workEndsAt
    ? Math.min(
        attempt.workSeconds,
        Math.max(
          0,
          Math.round((now - (attempt.workEndsAt - attempt.workSeconds * 1000)) / 1000),
        ),
      )
    : 0;

  const progressBefore = await db
    .prepare("SELECT xp FROM user_progress WHERE user_id = ?")
    .bind(userId)
    .first<{ xp: number }>();
  const levelBefore = levelForXp(progressBefore?.xp ?? 0);

  const streakRow = await db
    .prepare(
      "SELECT current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = ?",
    )
    .bind(userId)
    .first<{
      current_streak: number;
      longest_streak: number;
      last_activity_date: string | null;
    }>();
  const today = utcDateString(new Date());
  const streak = nextStreak(
    streakRow?.last_activity_date ?? null,
    streakRow?.current_streak ?? 0,
    streakRow?.longest_streak ?? 0,
    today,
  );

  await db.batch([
    db.prepare(
        "UPDATE challenge_attempts SET status = 'completed', completed_at = ?, score = ?, xp_awarded = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(now, evaluation.overallScore, xpAwarded, attempt.id),
    db.prepare(
        `INSERT INTO challenge_feedback (id, attempt_id, user_id, overall_score, dimension_scores, strengths, improvements, summary, next_challenge, ai_generated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        attempt.id,
        userId,
        evaluation.overallScore,
        JSON.stringify(evaluation.dimensionScores),
        JSON.stringify(evaluation.strengths),
        JSON.stringify(evaluation.improvements),
        evaluation.summary,
        evaluation.nextChallenge,
        evaluation.aiGenerated ? 1 : 0,
      ),
    db.prepare(
        "UPDATE user_progress SET xp = xp + ?, coins = coins + ?, total_completed = total_completed + 1, total_seconds = total_seconds + ?, updated_at = datetime('now') WHERE user_id = ?",
      )
      .bind(xpAwarded, coinsAwarded, elapsedSeconds, userId),
    db.prepare(
        "UPDATE user_streaks SET current_streak = ?, longest_streak = ?, last_activity_date = ?, updated_at = datetime('now') WHERE user_id = ?",
      )
      .bind(streak.current, streak.longest, today, userId),
    db.prepare(
        "INSERT INTO xp_history (id, user_id, attempt_id, amount, reason) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(
        crypto.randomUUID(),
        userId,
        attempt.id,
        xpAwarded,
        `${config.name} (${attempt.difficulty}) — score ${evaluation.overallScore}`,
      ),
  ]);

  const newBadges = await awardBadges(db, userId, {
    lastScore: evaluation.overallScore,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    completedDaily: attempt.isDaily,
  });

  const levelAfter = levelForXp((progressBefore?.xp ?? 0) + xpAwarded);

  await createNotification(
    db,
    userId,
    "challenge_completed",
    "CHALLENGE CLEARED",
    `"${attempt.title}" scored ${evaluation.overallScore}/100. +${xpAwarded} XP.`,
    `/challenges/${attempt.id}`,
  );
  if (levelAfter > levelBefore) {
    await createNotification(
      db,
      userId,
      "level_up",
      "LEVEL UP",
      `You reached level ${levelAfter}.`,
      "/profile",
    );
  }
  if (streak.changed && streak.current > 1) {
    await createNotification(
      db,
      userId,
      "streak",
      "STREAK EXTENDED",
      `${streak.current} days and counting. Don't break the chain.`,
      "/dashboard",
    );
  }

  const updated: Attempt = {
    ...attempt,
    status: "completed",
    completedAt: now,
    score: evaluation.overallScore,
    xpAwarded,
  };

  return {
    attempt: updated,
    evaluation,
    xpAwarded,
    coinsAwarded,
    newBadges,
    streak: {
      current: streak.current,
      longest: streak.longest,
      extended: streak.changed,
    },
    level: { before: levelBefore, after: levelAfter },
  };
}

async function awardBadges(
  db: D1Database,
  userId: string,
  extras: {
    lastScore: number;
    currentStreak: number;
    longestStreak: number;
    completedDaily: boolean;
  },
): Promise<{ id: string; name: string; description: string }[]> {
  const progress = await db
    .prepare("SELECT xp, total_completed FROM user_progress WHERE user_id = ?")
    .bind(userId)
    .first<{ xp: number; total_completed: number }>();
  const distinct = await db
    .prepare(
      "SELECT COUNT(DISTINCT category_id) AS n FROM challenge_attempts WHERE user_id = ? AND status = 'completed'",
    )
    .bind(userId)
    .first<{ n: number }>();
  const { results: owned } = await db
    .prepare("SELECT badge_id FROM user_badges WHERE user_id = ?")
    .bind(userId)
    .all<{ badge_id: string }>();
  const ownedIds = new Set((owned ?? []).map((r) => r.badge_id));

  const stats = {
    totalCompleted: progress?.total_completed ?? 0,
    currentStreak: extras.currentStreak,
    longestStreak: extras.longestStreak,
    level: levelForXp(progress?.xp ?? 0),
    lastScore: extras.lastScore,
    distinctCategories: distinct?.n ?? 0,
    completedDaily: extras.completedDaily,
  };

  const earned = BADGES.filter((b) => !ownedIds.has(b.id) && b.check(stats));
  for (const badge of earned) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)",
      )
      .bind(userId, badge.id)
      .run();
    await createNotification(
      db,
      userId,
      "achievement",
      "ACHIEVEMENT UNLOCKED",
      `${badge.name} — ${badge.description}`,
      "/achievements",
    );
  }
  return earned.map((b) => ({ id: b.id, name: b.name, description: b.description }));
}

export async function getFeedback(db: D1Database, attemptId: string) {
  const row = await db
    .prepare(
      "SELECT overall_score, dimension_scores, strengths, improvements, summary, next_challenge, ai_generated, created_at FROM challenge_feedback WHERE attempt_id = ? ORDER BY created_at DESC LIMIT 1",
    )
    .bind(attemptId)
    .first<{
      overall_score: number;
      dimension_scores: string;
      strengths: string;
      improvements: string;
      summary: string;
      next_challenge: string | null;
      ai_generated: number;
      created_at: string;
    }>();
  if (!row) return null;
  return {
    overallScore: row.overall_score,
    dimensionScores: JSON.parse(row.dimension_scores),
    strengths: JSON.parse(row.strengths),
    improvements: JSON.parse(row.improvements),
    summary: row.summary,
    nextChallenge: row.next_challenge,
    aiGenerated: row.ai_generated === 1,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Aggregates

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  image: string | null;
  xp: number;
  level: number;
  isMe: boolean;
};

export async function getLeaderboard(
  db: D1Database,
  meUserId: string,
  scope: "global" | "weekly",
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const query =
    scope === "global"
      ? db.prepare(
          `SELECT p.user_id, COALESCE(u.name, u.email, 'Anonymous') AS name, u.image, p.xp
           FROM user_progress p LEFT JOIN users u ON u.id = p.user_id
           WHERE p.xp > 0 ORDER BY p.xp DESC LIMIT ?`,
        ).bind(limit)
      : db.prepare(
          `SELECT h.user_id, COALESCE(u.name, u.email, 'Anonymous') AS name, u.image, SUM(h.amount) AS xp
           FROM xp_history h LEFT JOIN users u ON u.id = h.user_id
           WHERE h.created_at >= datetime('now', '-7 days')
           GROUP BY h.user_id ORDER BY xp DESC LIMIT ?`,
        ).bind(limit);

  const { results } = await query.all<{
    user_id: string;
    name: string;
    image: string | null;
    xp: number;
  }>();

  return (results ?? []).map((row, i) => ({
    rank: i + 1,
    userId: row.user_id,
    name: row.name,
    image: row.image,
    xp: row.xp,
    level: levelForXp(scope === "global" ? row.xp : 0) || 1,
    isMe: row.user_id === meUserId,
  }));
}

export async function getDashboardData(env: CloudflareEnv, userId: string) {
  const db = env.DB;
  await ensureProgress(db, userId);

  const progress = await db
    .prepare(
      "SELECT xp, coins, total_completed, total_failed, total_seconds FROM user_progress WHERE user_id = ?",
    )
    .bind(userId)
    .first<{
      xp: number;
      coins: number;
      total_completed: number;
      total_failed: number;
      total_seconds: number;
    }>();

  const streak = await db
    .prepare(
      "SELECT current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = ?",
    )
    .bind(userId)
    .first<{
      current_streak: number;
      longest_streak: number;
      last_activity_date: string | null;
    }>();

  // A streak is only "current" if it was fed today or yesterday.
  const today = utcDateString(new Date());
  const yesterday = utcDateString(new Date(Date.now() - 86_400_000));
  const last = streak?.last_activity_date;
  const currentStreak =
    last === today || last === yesterday ? (streak?.current_streak ?? 0) : 0;

  const active = await listAttempts(db, userId, [
    "not_started",
    "preparing",
    "active",
    "evaluating",
  ]);
  const recentCompleted = await listAttempts(db, userId, ["completed"], 5);

  const { results: weekRows } = await db
    .prepare(
      `SELECT date(created_at) AS day, SUM(amount) AS xp FROM xp_history
       WHERE user_id = ? AND created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at)`,
    )
    .bind(userId)
    .all<{ day: string; xp: number }>();
  const weekMap = new Map((weekRows ?? []).map((r) => [r.day, r.xp]));
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const day = utcDateString(new Date(Date.now() - (6 - i) * 86_400_000));
    return { day, xp: weekMap.get(day) ?? 0 };
  });

  const { results: badgeRows } = await db
    .prepare(
      "SELECT badge_id, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC LIMIT 8",
    )
    .bind(userId)
    .all<{ badge_id: string; earned_at: string }>();

  const dailyCategory = dailyCategoryId(new Date());
  const dailyDone = await db
    .prepare(
      "SELECT COUNT(*) AS n FROM challenge_attempts WHERE user_id = ? AND is_daily = 1 AND status = 'completed' AND date(completed_at / 1000, 'unixepoch') = date('now')",
    )
    .bind(userId)
    .first<{ n: number }>();

  const leaderboard = await getLeaderboard(db, userId, "global", 5);

  return {
    progress: {
      xp: progress?.xp ?? 0,
      coins: progress?.coins ?? 0,
      totalCompleted: progress?.total_completed ?? 0,
      totalFailed: progress?.total_failed ?? 0,
      totalSeconds: progress?.total_seconds ?? 0,
      ...levelProgress(progress?.xp ?? 0),
    },
    streak: {
      current: currentStreak,
      longest: streak?.longest_streak ?? 0,
      activeToday: last === today,
    },
    daily: { categoryId: dailyCategory, done: (dailyDone?.n ?? 0) > 0 },
    active: active.map(sanitizeAttempt),
    recentCompleted,
    badges: (badgeRows ?? []).map((r) => ({ id: r.badge_id, earnedAt: r.earned_at })),
    leaderboard,
    weekly,
  };
}

export async function getProfileData(env: CloudflareEnv, userId: string) {
  const db = env.DB;
  await ensureProgress(db, userId);

  const progress = await db
    .prepare(
      "SELECT xp, coins, total_completed, total_failed, total_seconds FROM user_progress WHERE user_id = ?",
    )
    .bind(userId)
    .first<{
      xp: number;
      coins: number;
      total_completed: number;
      total_failed: number;
      total_seconds: number;
    }>();

  const streak = await db
    .prepare("SELECT current_streak, longest_streak FROM user_streaks WHERE user_id = ?")
    .bind(userId)
    .first<{ current_streak: number; longest_streak: number }>();

  const avg = await db
    .prepare(
      "SELECT AVG(score) AS avg_score FROM challenge_attempts WHERE user_id = ? AND status = 'completed'",
    )
    .bind(userId)
    .first<{ avg_score: number | null }>();

  const favorite = await db
    .prepare(
      "SELECT category_id, COUNT(*) AS n FROM challenge_attempts WHERE user_id = ? AND status = 'completed' GROUP BY category_id ORDER BY n DESC LIMIT 1",
    )
    .bind(userId)
    .first<{ category_id: string; n: number }>();

  const { results: badgeRows } = await db
    .prepare(
      "SELECT badge_id, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at DESC",
    )
    .bind(userId)
    .all<{ badge_id: string; earned_at: string }>();

  const { results: perCategory } = await db
    .prepare(
      "SELECT category_id, COUNT(*) AS completed, AVG(score) AS avg_score FROM challenge_attempts WHERE user_id = ? AND status = 'completed' GROUP BY category_id",
    )
    .bind(userId)
    .all<{ category_id: string; completed: number; avg_score: number }>();

  const totalCompleted = progress?.total_completed ?? 0;
  const totalFailed = progress?.total_failed ?? 0;
  const attempts = totalCompleted + totalFailed;

  return {
    xp: progress?.xp ?? 0,
    coins: progress?.coins ?? 0,
    ...levelProgress(progress?.xp ?? 0),
    totalCompleted,
    totalFailed,
    successRate: attempts === 0 ? 0 : Math.round((totalCompleted / attempts) * 100),
    averageScore: Math.round(avg?.avg_score ?? 0),
    currentStreak: streak?.current_streak ?? 0,
    longestStreak: streak?.longest_streak ?? 0,
    favoriteCategory: favorite?.category_id ?? null,
    totalHours: Math.round(((progress?.total_seconds ?? 0) / 3600) * 10) / 10,
    badges: (badgeRows ?? []).map((r) => ({ id: r.badge_id, earnedAt: r.earned_at })),
    perCategory: (perCategory ?? []).map((r) => ({
      categoryId: r.category_id,
      completed: r.completed,
      avgScore: Math.round(r.avg_score),
    })),
  };
}

export async function getHistory(db: D1Database, userId: string, limit = 50) {
  return listAttempts(db, userId, ["completed", "failed"], limit);
}

export async function getNotifications(db: D1Database, userId: string) {
  const { results } = await db
    .prepare(
      "SELECT id, type, title, body, link, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30",
    )
    .bind(userId)
    .all<{
      id: string;
      type: string;
      title: string;
      body: string;
      link: string | null;
      read: number;
      created_at: string;
    }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    link: r.link,
    read: r.read === 1,
    createdAt: r.created_at,
  }));
}

export async function markNotificationsRead(db: D1Database, userId: string) {
  await db
    .prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0")
    .bind(userId)
    .run();
}

export function categoryMeta(config: CategoryConfig) {
  return {
    id: config.id,
    name: config.name,
    tagline: config.tagline,
    glyph: config.glyph,
    submissionType: config.submissionType,
    prepSeconds: config.prepSeconds,
    workSeconds: config.workSeconds,
    xpReward: config.xpReward,
    dimensions: config.dimensions,
  };
}
