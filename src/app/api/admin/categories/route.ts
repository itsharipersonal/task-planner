import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { listMergedCategories, mergeCategoryRow, seedCategoryDisplayFromRegistry } from "@/lib/challenges/categories";
import { CATEGORY_REGISTRY } from "@/lib/challenges/registry";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  await seedCategoryDisplayFromRegistry(admin.env.DB);
  const categories = await listMergedCategories(admin.env.DB);
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    slug?: string;
    icon?: string;
    color?: string;
    description?: string;
  };

  if (!body.id || !CATEGORY_REGISTRY[body.id]) {
    return NextResponse.json({ error: "Valid category id required" }, { status: 400 });
  }

  await admin.env.DB.prepare(
    `INSERT INTO challenge_categories (id, name, slug, icon, color, description, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM challenge_categories))
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       slug = excluded.slug,
       icon = excluded.icon,
       color = excluded.color,
       description = excluded.description`,
  )
    .bind(
      body.id,
      body.name ?? CATEGORY_REGISTRY[body.id].name,
      body.slug ?? body.id,
      body.icon ?? CATEGORY_REGISTRY[body.id].glyph,
      body.color ?? null,
      body.description ?? CATEGORY_REGISTRY[body.id].tagline,
    )
    .run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "create_category",
    module: "categories",
    resourceId: body.id,
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
