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
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    instructions?: string;
    enabled?: boolean;
  };

  const sets: string[] = [];
  const binds: unknown[] = [];
  if (typeof body.title === "string") {
    sets.push("title = ?");
    binds.push(body.title.trim());
  }
  if (typeof body.description === "string") {
    sets.push("description = ?");
    binds.push(body.description.trim());
  }
  if (typeof body.instructions === "string") {
    sets.push("instructions = ?");
    binds.push(body.instructions.trim());
  }
  if (typeof body.enabled === "boolean") {
    sets.push("enabled = ?");
    binds.push(body.enabled ? 1 : 0);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  await admin.env.DB.prepare(
    `UPDATE challenge_templates SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(...binds, id)
    .run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "update_template",
    module: "templates",
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
  await admin.env.DB.prepare("DELETE FROM challenge_templates WHERE id = ?")
    .bind(id)
    .run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "delete_template",
    module: "templates",
    resourceId: id,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
