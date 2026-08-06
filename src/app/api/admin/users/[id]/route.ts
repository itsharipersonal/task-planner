import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { getUserDetail } from "@/lib/admin/users";
import { requireModerator } from "@/lib/auth";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const detail = await getUserDetail(admin.env.DB, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    action?: "reset_xp" | "reset_coins" | "reset_streak" | "delete";
  };

  if (admin.role !== "admin" && admin.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = admin.env.DB;

  if (body.action === "reset_xp") {
    await db.prepare("UPDATE user_progress SET xp = 0, updated_at = datetime('now') WHERE user_id = ?").bind(id).run();
  } else if (body.action === "reset_coins") {
    await db.prepare("UPDATE user_progress SET coins = 0, updated_at = datetime('now') WHERE user_id = ?").bind(id).run();
  } else if (body.action === "reset_streak") {
    await db.prepare("UPDATE user_streaks SET current_streak = 0, updated_at = datetime('now') WHERE user_id = ?").bind(id).run();
  } else if (body.action === "delete") {
    if (admin.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db.prepare("UPDATE users SET status = 'deleted', updated_at = datetime('now') WHERE id = ?").bind(id).run();
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  await logAdminAction(db, {
    adminId: admin.userId,
    action: body.action ?? "update",
    module: "users",
    resourceId: id,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
