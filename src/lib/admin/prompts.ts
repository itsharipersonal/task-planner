import { CATEGORY_REGISTRY } from "@/lib/challenges/registry";

export async function getPrompt(
  db: D1Database,
  categoryId: string,
  promptType: "generation" | "evaluation",
): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT content FROM ai_prompts WHERE category_id = ? AND prompt_type = ? ORDER BY version DESC LIMIT 1",
    )
    .bind(categoryId, promptType)
    .first<{ content: string }>();
  return row?.content ?? null;
}

export async function listPrompts(db: D1Database) {
  const { results } = await db
    .prepare(
      "SELECT id, category_id, prompt_type, content, version, updated_at FROM ai_prompts ORDER BY category_id, prompt_type",
    )
    .all();
  return results ?? [];
}

export async function seedPromptsFromRegistry(db: D1Database, updatedBy: string) {
  for (const cat of Object.values(CATEGORY_REGISTRY)) {
    for (const [promptType, content] of [
      ["generation", cat.generationGuidance],
      ["evaluation", cat.evaluationGuidance],
    ] as const) {
      const existing = await db
        .prepare(
          "SELECT id FROM ai_prompts WHERE category_id = ? AND prompt_type = ? LIMIT 1",
        )
        .bind(cat.id, promptType)
        .first();
      if (existing) continue;
      await db
        .prepare(
          "INSERT INTO ai_prompts (id, category_id, prompt_type, content, updated_by) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(crypto.randomUUID(), cat.id, promptType, content, updatedBy)
        .run();
    }
  }
}
