import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;

  const sets: string[] = ["updated_at = datetime('now')"];
  const binds: (string | number)[] = [];

  for (const key of ["name", "description", "icon", "visibility"] as const) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`);
      binds.push(String(body[key]));
    }
  }
  if (body.xp !== undefined) {
    sets.push("xp = ?");
    binds.push(Number(body.xp));
  }
  if (body.coins !== undefined) {
    sets.push("coins = ?");
    binds.push(Number(body.coins));
  }
  if (body.enabled !== undefined) {
    sets.push("enabled = ?");
    binds.push(body.enabled ? 1 : 0);
  }

  binds.push(id);
  await admin.env.DB.prepare(
    `UPDATE badge_definitions SET ${sets.join(", ")} WHERE id = ?`,
  )
    .bind(...binds)
    .run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "update_badge",
    module: "badges",
    resourceId: id,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  await admin.env.DB.prepare("UPDATE badge_definitions SET enabled = 0 WHERE id = ?").bind(id).run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "disable_badge",
    module: "badges",
    resourceId: id,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
