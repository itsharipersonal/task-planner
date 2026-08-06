-- Hybrid category display fields (behavior stays in registry.ts)

ALTER TABLE challenge_categories ADD COLUMN name TEXT;
ALTER TABLE challenge_categories ADD COLUMN slug TEXT;
ALTER TABLE challenge_categories ADD COLUMN icon TEXT;
ALTER TABLE challenge_categories ADD COLUMN color TEXT;
ALTER TABLE challenge_categories ADD COLUMN description TEXT;
ALTER TABLE challenge_categories ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'disabled'));

UPDATE challenge_categories SET slug = id WHERE slug IS NULL;
