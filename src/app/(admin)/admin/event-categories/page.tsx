import { Suspense } from "react";
import { AdminEventCategories } from "@/components/admin/admin-event-categories";
import { AdminPermissionBoundary } from "@/components/admin/admin-permission-boundary";
import { getPrisma } from "@/lib/prisma";

export const instant = false;

export default function AdminEventCategoriesPage() {
  return (
    <AdminPermissionBoundary permission="events.view">
      <Suspense fallback={<EventCategoriesLoading />}>
        <EventCategoriesContent />
      </Suspense>
    </AdminPermissionBoundary>
  );
}

async function EventCategoriesContent() {
  const prisma = getPrisma();
  const [categories, counts] = await Promise.all([
    prisma.eventCategory.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma.event.groupBy({
      by: ["categoryId"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
  ]);
  return (
    <AdminEventCategories
      categories={categories.map((category) => ({
        ...category,
        eventCount: counts.find((count) => count.categoryId === category.id)?._count.id ?? 0,
      }))}
    />
  );
}

function EventCategoriesLoading() {
  return (
    <section aria-live="polite" className="admin-events-page">
      <header className="admin-events-header">
        <div>
          <p className="eyebrow">Operations / Events</p>
          <h1>Event categories</h1>
          <p>Loading event categories…</p>
        </div>
      </header>
    </section>
  );
}
