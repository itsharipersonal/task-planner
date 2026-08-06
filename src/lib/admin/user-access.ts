import type { UserRole, UserStatus } from "@/types/admin";

export function parseAdminEmails(env: CloudflareEnv): string[] {
  return (env.ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(env: CloudflareEnv, email: string | null): boolean {
  if (!email) return false;
  return parseAdminEmails(env).includes(email.toLowerCase());
}

export async function loadUserAccess(
  db: D1Database,
  userId: string,
): Promise<{ role: UserRole; status: UserStatus } | null> {
  const row = await db
    .prepare("SELECT role, status FROM users WHERE id = ?")
    .bind(userId)
    .first<{ role: UserRole; status: UserStatus }>();
  if (!row) return null;
  return { role: row.role ?? "user", status: row.status ?? "active" };
}

export async function bootstrapSuperAdmin(
  db: D1Database,
  env: CloudflareEnv,
  userId: string,
  email: string | null,
): Promise<void> {
  if (!email || !isAdminEmail(env, email)) return;
  await db
    .prepare(
      `UPDATE users SET role = 'super_admin', updated_at = datetime('now')
       WHERE id = ? AND role = 'user'`,
    )
    .bind(userId)
    .run();
}
