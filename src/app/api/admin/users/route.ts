import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { listUsers } from "@/lib/admin/users";
import { requireModerator } from "@/lib/auth";

export async function GET(request: Request) {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const url = new URL(request.url);
  const data = await listUsers(admin.env.DB, {
    q: url.searchParams.get("q") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 25),
    offset: Number(url.searchParams.get("offset") ?? 0),
  });

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const admin = await requireModerator();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as {
    userId?: string;
    role?: string;
    status?: string;
  };

  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const db = admin.env.DB;

  if (body.role) {
    if (admin.role !== "admin" && admin.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (body.role === "super_admin" && admin.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db
      .prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(body.role, body.userId)
      .run();
    await logAdminAction(db, {
      adminId: admin.userId,
      action: "change_role",
      module: "users",
      resourceId: body.userId,
      metadata: { role: body.role },
      ip: getClientIp(request),
    });
  }

  if (body.status) {
    if (admin.role !== "admin" && admin.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await db
      .prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(body.status, body.userId)
      .run();
    await logAdminAction(db, {
      adminId: admin.userId,
      action: body.status === "blocked" ? "block_user" : "update_status",
      module: "users",
      resourceId: body.userId,
      metadata: { status: body.status },
      ip: getClientIp(request),
    });
  }

  return NextResponse.json({ ok: true });
}
