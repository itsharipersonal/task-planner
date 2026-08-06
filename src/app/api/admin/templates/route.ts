import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCategory } from "@/lib/challenges/registry";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { results } = await admin.env.DB.prepare(
    "SELECT id, category_id, difficulty, title, description, instructions, payload, enabled, created_by, created_at FROM challenge_templates ORDER BY created_at DESC",
  ).all();
  return NextResponse.json({ templates: results ?? [] });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as {
    categoryId?: string;
    difficulty?: string;
    title?: string;
    description?: string;
    instructions?: string;
    payload?: unknown;
  };

  if (
    !body.categoryId ||
    !getCategory(body.categoryId) ||
    !["easy", "medium", "hard"].includes(body.difficulty ?? "") ||
    !body.title?.trim() ||
    !body.description?.trim() ||
    !body.instructions?.trim()
  ) {
    return NextResponse.json(
      { error: "categoryId, difficulty, title, description and instructions are required" },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  await admin.env.DB.prepare(
    "INSERT INTO challenge_templates (id, category_id, difficulty, title, description, instructions, payload, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      id,
      body.categoryId,
      body.difficulty,
      body.title.trim(),
      body.description.trim(),
      body.instructions.trim(),
      body.payload ? JSON.stringify(body.payload) : null,
      admin.email,
    )
    .run();

  return NextResponse.json({ id }, { status: 201 });
}
