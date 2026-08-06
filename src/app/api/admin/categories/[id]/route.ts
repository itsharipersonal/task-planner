import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { id } = await ctx.params;
  const body = (await request.json()) as { enabled?: boolean };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) required" }, { status: 400 });
  }

  await admin.env.DB.prepare(
    "UPDATE challenge_categories SET enabled = ? WHERE id = ?",
  )
    .bind(body.enabled ? 1 : 0, id)
    .run();
  return NextResponse.json({ ok: true });
}
