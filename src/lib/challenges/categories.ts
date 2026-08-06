import { CATEGORY_REGISTRY, getCategory } from "./registry";

export type MergedCategory = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  glyph: string;
  icon: string | null;
  color: string | null;
  description: string | null;
  enabled: boolean;
  sortOrder: number;
  status: string;
  submissionType: string;
  prepSeconds: Record<string, number>;
  workSeconds: Record<string, number>;
  xpReward: Record<string, number>;
};

type CategoryRow = {
  id: string;
  enabled: number;
  sort_order: number;
  name: string | null;
  slug: string | null;
  icon: string | null;
  color: string | null;
  description: string | null;
  status: string | null;
};

export function mergeCategoryRow(row: CategoryRow): MergedCategory | null {
  const registry = getCategory(row.id);
  if (!registry) return null;
  return {
    id: row.id,
    name: row.name ?? registry.name,
    slug: row.slug ?? row.id,
    tagline: registry.tagline,
    glyph: row.icon ?? registry.glyph,
    icon: row.icon,
    color: row.color,
    description: row.description ?? registry.tagline,
    enabled: row.enabled === 1 && row.status !== "disabled",
    sortOrder: row.sort_order,
    status: row.status ?? "active",
    submissionType: registry.submissionType,
    prepSeconds: registry.prepSeconds,
    workSeconds: registry.workSeconds,
    xpReward: registry.xpReward,
  };
}

export async function getCategoryConfig(
  db: D1Database,
  id: string,
): Promise<MergedCategory | null> {
  const row = await db
    .prepare(
      "SELECT id, enabled, sort_order, name, slug, icon, color, description, status FROM challenge_categories WHERE id = ?",
    )
    .bind(id)
    .first<CategoryRow>();
  if (!row) return null;
  return mergeCategoryRow(row);
}

export async function listMergedCategories(
  db: D1Database,
): Promise<MergedCategory[]> {
  const { results } = await db
    .prepare(
      "SELECT id, enabled, sort_order, name, slug, icon, color, description, status FROM challenge_categories ORDER BY sort_order",
    )
    .all<CategoryRow>();
  return (results ?? [])
    .map((row) => mergeCategoryRow(row))
    .filter((c): c is MergedCategory => c !== null);
}

export async function listEnabledMergedCategories(
  db: D1Database,
): Promise<MergedCategory[]> {
  const all = await listMergedCategories(db);
  return all.filter((c) => c.enabled);
}

export function seedCategoryDisplayFromRegistry(db: D1Database): Promise<void> {
  const updates = Object.values(CATEGORY_REGISTRY).map((cat) =>
    db
      .prepare(
        `UPDATE challenge_categories SET name = ?, slug = ?, icon = ?, description = ?
         WHERE id = ? AND name IS NULL`,
      )
      .bind(cat.name, cat.id, cat.glyph, cat.tagline, cat.id)
      .run(),
  );
  return Promise.all(updates).then(() => undefined);
}
