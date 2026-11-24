import { Suspense } from "react";
import { AdminMenuCategories } from "@/components/admin/admin-menu-categories";
import { getPrisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default function AdminRestaurantCategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<MenuCategoriesLoading />}>
      <MenuCategoriesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function MenuCategoriesContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = firstValue(params.q)?.trim().slice(0, 120) ?? "";
  const requestedPage = parsePositiveInteger(firstValue(params.page), 1);
  const requestedPageSize = parsePositiveInteger(firstValue(params.pageSize), 10);
  const pageSize = [10, 25, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 10;
  const where = query
    ? { name: { contains: query, mode: "insensitive" as const } }
    : {};
  const prisma = getPrisma();
  const total = await prisma.menuCategory.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const categories = await prisma.menuCategory.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { _count: { select: { items: true } } },
  });

  return (
    <AdminMenuCategories
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        isActive: category.isActive,
        itemCount: category._count.items,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      }))}
      filters={{ query, page, pageSize }}
      pageCount={pageCount}
      total={total}
    />
  );
}

function MenuCategoriesLoading() {
  return (
    <section aria-live="polite" className="admin-events-page admin-menu-page">
      <header className="admin-events-header">
        <div>
          <p className="eyebrow">Restaurant / Menu Categories</p>
          <h1>Menu categories</h1>
          <p>Loading restaurant menu categories…</p>
        </div>
      </header>
    </section>
  );
}
