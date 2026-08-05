import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { rowToTask } from "@/lib/tasks";

export async function GET() {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { env } = getCloudflareContext();
  const { results } = await env.DB.prepare(
    "SELECT id, title, completed, created_at, updated_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC",
  )
    .bind(authResult.userId)
    .all<{
      id: string;
      title: string;
      completed: number;
      created_at: string;
      updated_at: string;
    }>();

  return NextResponse.json({ tasks: (results ?? []).map(rowToTask) });
}

export async function POST(request: Request) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as { title?: string };
  const title = body.title?.trim();

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const { env } = getCloudflareContext();

  await env.DB.prepare("INSERT INTO tasks (id, title, user_id) VALUES (?, ?, ?)")
    .bind(id, title, authResult.userId)
    .run();

  const row = await env.DB.prepare(
    "SELECT id, title, completed, created_at, updated_at FROM tasks WHERE id = ? AND user_id = ?",
  )
    .bind(id, authResult.userId)
    .first<{
      id: string;
      title: string;
      completed: number;
      created_at: string;
      updated_at: string;
    }>();

  if (!row) {
    return NextResponse.json({ error: "failed to create task" }, { status: 500 });
  }

  return NextResponse.json({ task: rowToTask(row) }, { status: 201 });
}
