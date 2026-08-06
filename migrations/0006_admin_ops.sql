-- Admin operations: audit, settings, prompts, daily challenges, badges, leaderboard

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  resource_id TEXT,
  metadata TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs(admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_module ON audit_logs(module, created_at);

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_prompts (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category_id, prompt_type);

CREATE TABLE IF NOT EXISTS daily_challenges (
  id TEXT PRIMARY KEY,
  challenge_date TEXT NOT NULL,
  category_id TEXT NOT NULL,
  template_id TEXT,
  attempt_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  created_by TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_date ON daily_challenges(challenge_date);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  frozen_at TEXT NOT NULL DEFAULT (datetime('now')),
  data TEXT NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '★',
  xp INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  unlock_condition TEXT,
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'hidden')),
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed badge definitions from code defaults
INSERT OR IGNORE INTO badge_definitions (id, name, description, icon) VALUES
  ('first-blood', 'First Blood', 'Complete your first challenge.', '01'),
  ('five-alive', 'Five Alive', 'Complete 5 challenges.', '05'),
  ('double-digits', 'Double Digits', 'Complete 10 challenges.', '10'),
  ('quarter-century', 'Quarter Century', 'Complete 25 challenges.', '25'),
  ('half-century', 'Half Century', 'Complete 50 challenges.', '50'),
  ('streak-3', 'Warming Up', 'Reach a 3-day streak.', 'S3'),
  ('streak-7', 'One Week Wired', 'Reach a 7-day streak.', 'S7'),
  ('streak-30', 'Iron Month', 'Reach a 30-day streak.', 'S30'),
  ('level-5', 'Operator', 'Reach level 5.', 'L5'),
  ('level-10', 'Veteran', 'Reach level 10.', 'L10'),
  ('high-flyer', 'High Flyer', 'Score 90+ on a challenge.', '90+'),
  ('perfect', 'Flawless', 'Score a perfect 100.', '100'),
  ('polymath', 'Polymath', 'Complete challenges in 5 different categories.', 'PX5'),
  ('daily-op', 'Daily Operative', 'Complete a daily challenge.', 'DLY');

-- Default platform settings
INSERT OR IGNORE INTO platform_settings (key, value) VALUES
  ('platform_name', '"Forge OS"'),
  ('maintenance_mode', 'false'),
  ('registration_enabled', 'true'),
  ('daily_challenge_enabled', 'true'),
  ('xp_multiplier', '1'),
  ('coin_multiplier', '1'),
  ('max_daily_xp', '500'),
  ('max_streak_bonus', '50'),
  ('weekly_reset_enabled', 'true'),
  ('leaderboard_visibility', '"public"');
