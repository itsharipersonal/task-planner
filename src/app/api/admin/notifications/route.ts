import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as {
    target?: "all" | "role" | "users" | "inactive";
    role?: string;
    userIds?: string[];
    type?: string;
    title?: string;
    body?: string;
    link?: string;
  };

  if (!body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const db = admin.env.DB;
  let userIds: string[] = [];

  if (body.target === "all" || !body.target) {
    const { results } = await db.prepare("SELECT id FROM users WHERE status = 'active'").all<{ id: string }>();
    userIds = (results ?? []).map((r) => r.id);
  } else if (body.target === "role" && body.role) {
    const { results } = await db.prepare("SELECT id FROM users WHERE role = ? AND status = 'active'").bind(body.role).all<{ id: string }>();
    userIds = (results ?? []).map((r) => r.id);
  } else if (body.target === "users" && body.userIds?.length) {
    userIds = body.userIds;
  } else if (body.target === "inactive") {
    const { results } = await db.prepare(
      `SELECT u.id FROM users u
       WHERE u.status = 'active'
       AND u.id NOT IN (
         SELECT DISTINCT user_id FROM challenge_attempts
         WHERE created_at >= date('now', '-14 days')
       )`,
    ).all<{ id: string }>();
    userIds = (results ?? []).map((r) => r.id);
  }

  const batch = userIds.map((userId) =>
    db.prepare(
      "INSERT INTO notifications (id, user_id, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(
      crypto.randomUUID(),
      userId,
      body.type ?? "announcement",
      body.title!.trim(),
      body.body!.trim(),
      body.link ?? null,
    ),
  );

  if (batch.length > 0) await db.batch(batch);

  await logAdminAction(db, {
    adminId: admin.userId,
    action: "send_notification",
    module: "notifications",
    metadata: { target: body.target, count: userIds.length },
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true, sent: userIds.length });
}
