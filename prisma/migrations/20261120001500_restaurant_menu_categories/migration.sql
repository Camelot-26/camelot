CREATE TABLE "menu_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "menu_categories_name_key" ON "menu_categories"("name");
CREATE INDEX "menu_categories_is_active_name_idx" ON "menu_categories"("is_active", "name");

INSERT INTO "menu_categories" ("id", "name", "is_active", "created_at", "updated_at")
SELECT
    md5(category_key),
    CASE WHEN category_key = 'uncategorized' THEN 'Uncategorized' ELSE MIN(category_name) END,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        COALESCE(NULLIF(lower(btrim("category")), ''), 'uncategorized') AS category_key,
        btrim("category") AS category_name
    FROM "menu_items"
) AS normalized_categories
GROUP BY category_key;

ALTER TABLE "menu_items" ADD COLUMN "category_id" TEXT;

UPDATE "menu_items" AS item
SET "category_id" = category.id
FROM "menu_categories" AS category
WHERE category.id = md5(COALESCE(NULLIF(lower(btrim(item.category)), ''), 'uncategorized'));

ALTER TABLE "menu_items" ALTER COLUMN "category_id" SET NOT NULL;
ALTER TABLE "menu_items" DROP COLUMN "category";
CREATE INDEX "menu_items_category_id_name_idx" ON "menu_items"("category_id", "name");
ALTER TABLE "menu_items"
ADD CONSTRAINT "menu_items_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
