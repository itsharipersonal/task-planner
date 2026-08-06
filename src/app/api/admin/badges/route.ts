import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { results } = await admin.env.DB.prepare(
    "SELECT * FROM badge_definitions ORDER BY id",
  ).all();

  return NextResponse.json({ badges: results ?? [] });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    description?: string;
    icon?: string;
    xp?: number;
    coins?: number;
    visibility?: string;
  };

  if (!body.id?.trim() || !body.name?.trim()) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 });
  }

  await admin.env.DB.prepare(
    `INSERT INTO badge_definitions (id, name, description, icon, xp, coins, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      body.id.trim(),
      body.name.trim(),
      body.description ?? "",
      body.icon ?? "★",
      body.xp ?? 0,
      body.coins ?? 0,
      body.visibility ?? "public",
    )
    .run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "create_badge",
    module: "badges",
    resourceId: body.id,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
