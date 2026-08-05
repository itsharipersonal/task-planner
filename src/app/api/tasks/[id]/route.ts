import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { rowToTask, type UpdateTaskInput } from "@/lib/tasks";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await context.params;
  const body = (await request.json()) as UpdateTaskInput;
  const { env } = getCloudflareContext();

  const existing = await env.DB.prepare(
    "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
  )
    .bind(id, authResult.userId)
    .first<{ id: string }>();

  if (!existing) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  const title =
    body.title !== undefined ? body.title.trim() : undefined;

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
  }

  const completed =
    body.completed !== undefined ? (body.completed ? 1 : 0) : undefined;

  if (title !== undefined && completed !== undefined) {
    await env.DB.prepare(
      "UPDATE tasks SET title = ?, completed = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    )
      .bind(title, completed, id, authResult.userId)
      .run();
  } else if (title !== undefined) {
    await env.DB.prepare(
      "UPDATE tasks SET title = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    )
      .bind(title, id, authResult.userId)
      .run();
  } else if (completed !== undefined) {
    await env.DB.prepare(
      "UPDATE tasks SET completed = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
    )
      .bind(completed, id, authResult.userId)
      .run();
  }

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

  return NextResponse.json({ task: rowToTask(row!) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireUserId();
  if ("error" in authResult) return authResult.error;

  const { id } = await context.params;
  const { env } = getCloudflareContext();

  const result = await env.DB.prepare(
    "DELETE FROM tasks WHERE id = ? AND user_id = ?",
  )
    .bind(id, authResult.userId)
    .run();

  if (!result.meta.changes) {
    return NextResponse.json({ error: "task not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
