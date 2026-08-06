
type AuditParams = {
  adminId: string;
  action: string;
  module: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

export async function logAdminAction(
  db: D1Database,
  params: AuditParams,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_logs (id, admin_id, action, module, resource_id, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      params.adminId,
      params.action,
      params.module,
      params.resourceId ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.ip ?? null,
    )
    .run();
}

export function getClientIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

export async function getAuditLogs(
  db: D1Database,
  limit = 50,
  offset = 0,
) {
  const { results } = await db
    .prepare(
      `SELECT a.id, a.admin_id, a.action, a.module, a.resource_id, a.metadata,
              a.ip_address, a.created_at,
              COALESCE(u.name, u.email, a.admin_id) AS admin_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.admin_id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(limit, offset)
    .all();
  return results ?? [];
}

export async function getSetting(
  db: D1Database,
  key: string,
  fallback: string,
): Promise<string> {
  const row = await db
    .prepare("SELECT value FROM platform_settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? fallback;
}

export async function getSettingBool(
  db: D1Database,
  key: string,
  fallback: boolean,
): Promise<boolean> {
  const raw = await getSetting(db, key, fallback ? "true" : "false");
  return raw === "true" || raw === "1";
}

export async function setSetting(
  db: D1Database,
  key: string,
  value: string,
  updatedBy: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO platform_settings (key, value, updated_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_by = excluded.updated_by,
         updated_at = datetime('now')`,
    )
    .bind(key, value, updatedBy)
    .run();
}

export async function isMaintenanceMode(env: CloudflareEnv): Promise<boolean> {
  try {
    return await getSettingBool(env.DB, "maintenance_mode", false);
  } catch {
    return false;
  }
}
