import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { getCategoryConfig } from "@/lib/challenges/categories";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;
  const { id } = await ctx.params;
  const category = await getCategoryConfig(admin.env.DB, id);
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ category });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as {
    enabled?: boolean;
    name?: string;
    slug?: string;
    icon?: string;
    color?: string;
    description?: string;
    status?: string;
    sortOrder?: number;
  };

  const sets: string[] = [];
  const binds: (string | number | null)[] = [];

  if (typeof body.enabled === "boolean") {
    sets.push("enabled = ?");
    binds.push(body.enabled ? 1 : 0);
  }
  if (body.name !== undefined) {
    sets.push("name = ?");
    binds.push(body.name);
  }
  if (body.slug !== undefined) {
    sets.push("slug = ?");
    binds.push(body.slug);
  }
  if (body.icon !== undefined) {
    sets.push("icon = ?");
    binds.push(body.icon);
  }
  if (body.color !== undefined) {
    sets.push("color = ?");
    binds.push(body.color);
  }
  if (body.description !== undefined) {
    sets.push("description = ?");
    binds.push(body.description);
  }
  if (body.status !== undefined) {
    sets.push("status = ?");
    binds.push(body.status);
  }
  if (body.sortOrder !== undefined) {
    sets.push("sort_order = ?");
    binds.push(body.sortOrder);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  binds.push(id);
  await admin.env.DB.prepare(
    `UPDATE challenge_categories SET ${sets.join(", ")} WHERE id = ?`,
  )
    .bind(...binds)
    .run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "update_category",
    module: "categories",
    resourceId: id,
    metadata: body as Record<string, unknown>,
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
  await admin.env.DB.prepare(
    "UPDATE challenge_categories SET status = 'disabled', enabled = 0 WHERE id = ?",
  )
    .bind(id)
    .run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "disable_category",
    module: "categories",
    resourceId: id,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
