import { Suspense } from "react";
import { AdminMenuManagement } from "@/components/admin/admin-menu-management";
import { AdminPermissionBoundary } from "@/components/admin/admin-permission-boundary";
import { getPrisma } from "@/lib/prisma";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default function AdminRestaurantMenusPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <AdminPermissionBoundary permission="restaurant.view">
      <Suspense fallback={<MenuItemsLoading />}>
        <MenuItemsContent searchParams={searchParams} />
      </Suspense>
    </AdminPermissionBoundary>
  );
}

async function MenuItemsContent({
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
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          {
            category: {
              is: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
          },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const prisma = getPrisma();
  const [total, categories] = await Promise.all([
    prisma.menuItem.count({ where }),
    prisma.menuCategory.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: { category: { select: { name: true } } },
  });

  return (
    <AdminMenuManagement
      categories={categories}
      items={items.map((item) => ({
        id: item.id,
        name: item.name,
        categoryId: item.categoryId,
        categoryName: item.category.name,
        description: item.description,
        price: Number(item.price),
        isAvailable: item.isAvailable,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }))}
      filters={{ query, page, pageSize }}
      pageCount={pageCount}
      total={total}
    />
  );
}

function MenuItemsLoading() {
  return (
    <section aria-live="polite" className="admin-events-page admin-menu-page">
      <header className="admin-events-header">
        <div>
          <p className="eyebrow">Restaurant / Menus</p>
          <h1>Menu items</h1>
          <p>Loading restaurant menu items…</p>
        </div>
      </header>
    </section>
  );
}
