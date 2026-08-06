-- Admin RBAC: roles and user status

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'moderator', 'admin', 'super_admin'));
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'blocked', 'deleted'));
ALTER TABLE users ADD COLUMN created_at TEXT;
ALTER TABLE users ADD COLUMN updated_at TEXT;

UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL;
UPDATE users SET updated_at = datetime('now') WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
