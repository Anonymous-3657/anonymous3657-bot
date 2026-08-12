import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { api } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function Categories() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useSeo({
    title: "Categories — CG STUDENT PORTAL",
    description: "Question papers, notes, syllabus, books, practicals and assignments.",
    path: "/categories",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.categories();
      setItems(data.items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Categories"
        description="Every resource is tagged to a category so students find material fast."
        breadcrumbs={<Breadcrumbs items={[{ label: "Categories" }]} />}
      />
      <div className="container-page py-14" data-testid="categories-page">
        {loading ? (
          <CardSkeletonGrid count={6} />
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <CategoryCard key={c.id} category={c} />
            ))}
          </div>
        ) : (
          <EmptyState title="No categories yet" />
        )}
      </div>
    </AppShell>
  );
}
