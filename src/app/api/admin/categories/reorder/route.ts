import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as { order?: string[] };
  if (!body.order?.length) {
    return NextResponse.json({ error: "order array required" }, { status: 400 });
  }

  const batch = body.order.map((id, index) =>
    admin.env.DB.prepare("UPDATE challenge_categories SET sort_order = ? WHERE id = ?").bind(
      index + 1,
      id,
    ),
  );
  await admin.env.DB.batch(batch);

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "reorder_categories",
    module: "categories",
    metadata: { order: body.order },
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true });
}
