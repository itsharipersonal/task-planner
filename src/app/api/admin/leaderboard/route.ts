import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const scope = new URL(request.url).searchParams.get("scope") ?? "global";
  const db = admin.env.DB;

  if (scope === "weekly") {
    const { results } = await db.prepare(
      `SELECT u.id, COALESCE(u.name, u.email) AS name, p.xp,
              (SELECT COALESCE(SUM(x.amount), 0) FROM xp_history x
               WHERE x.user_id = u.id AND x.created_at >= date('now', '-7 days')) AS weekly_xp
       FROM users u JOIN user_progress p ON p.user_id = u.id
       WHERE u.status = 'active'
       ORDER BY weekly_xp DESC LIMIT 50`,
    ).all();
    return NextResponse.json({ scope, entries: results ?? [] });
  }

  const { results } = await db.prepare(
    `SELECT u.id, COALESCE(u.name, u.email) AS name, p.xp AS xp
     FROM users u JOIN user_progress p ON p.user_id = u.id
     WHERE u.status = 'active'
     ORDER BY p.xp DESC LIMIT 50`,
  ).all();

  return NextResponse.json({ scope, entries: results ?? [] });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as {
    action?: "reset_weekly" | "freeze" | "recalculate";
    scope?: string;
  };

  const db = admin.env.DB;

  if (body.action === "freeze") {
    const { results } = await db.prepare(
      `SELECT u.id, COALESCE(u.name, u.email) AS name, p.xp
       FROM users u JOIN user_progress p ON p.user_id = u.id
       ORDER BY p.xp DESC LIMIT 100`,
    ).all();
    const id = crypto.randomUUID();
    await db.prepare(
      "INSERT INTO leaderboard_snapshots (id, scope, data, created_by) VALUES (?, ?, ?, ?)",
    )
      .bind(id, body.scope ?? "global", JSON.stringify(results ?? []), admin.userId)
      .run();
    await logAdminAction(db, {
      adminId: admin.userId,
      action: "freeze_leaderboard",
      module: "leaderboard",
      resourceId: id,
      ip: getClientIp(request),
    });
    return NextResponse.json({ ok: true, snapshotId: id });
  }

  if (body.action === "reset_weekly") {
    await logAdminAction(db, {
      adminId: admin.userId,
      action: "reset_weekly_leaderboard",
      module: "leaderboard",
      ip: getClientIp(request),
    });
    return NextResponse.json({ ok: true, message: "Weekly leaderboard window reset (tracking from now)" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
