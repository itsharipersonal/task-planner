-- AI Accountability Challenge System

CREATE TABLE IF NOT EXISTS challenge_categories (
  id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS challenge_templates (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  payload TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_templates_category ON challenge_templates(category_id);

CREATE TABLE IF NOT EXISTS challenge_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  template_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  prep_seconds INTEGER NOT NULL DEFAULT 0,
  work_seconds INTEGER NOT NULL DEFAULT 300,
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  is_daily INTEGER NOT NULL DEFAULT 0,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  prep_ends_at INTEGER,
  work_ends_at INTEGER,
  submitted_at INTEGER,
  completed_at INTEGER,
  score INTEGER,
  xp_awarded INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON challenge_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_status ON challenge_attempts(user_id, status);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_submissions_attempt ON challenge_submissions(attempt_id);

CREATE TABLE IF NOT EXISTS challenge_feedback (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  dimension_scores TEXT NOT NULL,
  strengths TEXT NOT NULL,
  improvements TEXT NOT NULL,
  summary TEXT NOT NULL,
  next_challenge TEXT,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  overridden_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_attempt ON challenge_feedback(attempt_id);

CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  total_completed INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id TEXT PRIMARY KEY,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS xp_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  attempt_id TEXT,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_xp_user_date ON xp_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_xp_date ON xp_history(created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- Seed category rows (metadata lives in the code registry; DB stores enable/order)
INSERT OR IGNORE INTO challenge_categories (id, sort_order) VALUES
  ('public-speaking', 1),
  ('writing', 2),
  ('coding', 3),
  ('reading', 4),
  ('mental-math', 5),
  ('interview', 6),
  ('language', 7),
  ('fitness', 8),
  ('creativity', 9),
  ('sales-pitch', 10),
  ('problem-solving', 11),
  ('social-confidence', 12),
  ('learning-sprint', 13);
