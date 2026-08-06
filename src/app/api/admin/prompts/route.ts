import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { listPrompts, seedPromptsFromRegistry } from "@/lib/admin/prompts";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  await seedPromptsFromRegistry(admin.env.DB, admin.userId);
  const prompts = await listPrompts(admin.env.DB);
  return NextResponse.json({ prompts });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as {
    categoryId?: string;
    promptType?: string;
    content?: string;
  };

  if (!body.categoryId || !body.promptType || !body.content?.trim()) {
    return NextResponse.json({ error: "categoryId, promptType, content required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await admin.env.DB.prepare(
    `INSERT INTO ai_prompts (id, category_id, prompt_type, content, version, updated_by)
     VALUES (?, ?, ?, ?, COALESCE((SELECT MAX(version) + 1 FROM ai_prompts WHERE category_id = ? AND prompt_type = ?), 1), ?)`,
  )
    .bind(id, body.categoryId, body.promptType, body.content.trim(), body.categoryId, body.promptType, admin.userId)
    .run();

  await logAdminAction(admin.env.DB, {
    adminId: admin.userId,
    action: "update_prompt",
    module: "prompts",
    resourceId: id,
    metadata: { categoryId: body.categoryId, promptType: body.promptType },
    ip: getClientIp(request),
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
