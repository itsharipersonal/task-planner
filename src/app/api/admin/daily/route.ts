import { NextResponse } from "next/server";
import { getClientIp, logAdminAction } from "@/lib/admin/audit";
import { generateChallenge } from "@/lib/ai";
import { getCategory } from "@/lib/challenges/registry";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const { results } = await admin.env.DB.prepare(
    "SELECT * FROM daily_challenges ORDER BY challenge_date DESC LIMIT 30",
  ).all();

  return NextResponse.json({ daily: results ?? [] });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if ("error" in admin) return admin.error;

  const body = (await request.json()) as {
    action?: "generate" | "manual" | "publish" | "archive";
    challengeDate?: string;
    categoryId?: string;
    difficulty?: string;
    title?: string;
    description?: string;
    instructions?: string;
    id?: string;
  };

  const db = admin.env.DB;
  const date = body.challengeDate ?? new Date().toISOString().slice(0, 10);

  if (body.action === "generate") {
    const categoryId = body.categoryId ?? "public-speaking";
    const category = getCategory(categoryId);
    if (!category) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const generated = await generateChallenge(
      admin.env,
      category,
      (body.difficulty as "easy" | "medium" | "hard") ?? "medium",
      [],
    );
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO daily_challenges (id, challenge_date, category_id, title, description, instructions, difficulty, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    )
      .bind(
        id,
        date,
        categoryId,
        generated.challenge.title,
        generated.challenge.description,
        generated.challenge.instructions,
        body.difficulty ?? "medium",
        admin.userId,
      )
      .run();
    return NextResponse.json({ ok: true, id, generated: generated.challenge });
  }

  if (body.action === "manual") {
    if (!body.title?.trim() || !body.categoryId) {
      return NextResponse.json({ error: "title and categoryId required" }, { status: 400 });
    }
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO daily_challenges (id, challenge_date, category_id, title, description, instructions, difficulty, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    )
      .bind(
        id,
        date,
        body.categoryId,
        body.title.trim(),
        body.description ?? "",
        body.instructions ?? "",
        body.difficulty ?? "medium",
        admin.userId,
      )
      .run();
    return NextResponse.json({ ok: true, id }, { status: 201 });
  }

  if (body.action === "publish" && body.id) {
    await db.prepare(
      "UPDATE daily_challenges SET status = 'published', published_at = datetime('now') WHERE id = ?",
    )
      .bind(body.id)
      .run();
    await logAdminAction(db, {
      adminId: admin.userId,
      action: "publish_daily",
      module: "daily_challenges",
      resourceId: body.id,
      ip: getClientIp(request),
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "archive" && body.id) {
    await db.prepare("UPDATE daily_challenges SET status = 'archived' WHERE id = ?").bind(body.id).run();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
