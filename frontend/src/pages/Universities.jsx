import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { UniversityCard } from "@/components/cards/UniversityCard";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { api } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function Universities() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useSeo({
    title: "Universities — CG STUDENT PORTAL",
    description: "Browse universities on CG STUDENT PORTAL and open their courses and subjects.",
    path: "/universities",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.universities({ limit: 24 });
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
        title="Universities"
        description="Every university, college and course lives in the database — adding a new one needs records, not code."
        breadcrumbs={<Breadcrumbs items={[{ label: "Universities" }]} />}
      />
      <div className="container-page py-14" data-testid="universities-page">
        {loading ? (
          <CardSkeletonGrid count={3} />
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((u) => (
              <UniversityCard key={u.id} university={u} />
            ))}
          </div>
        ) : (
          <EmptyState title="No universities added yet" />
        )}
      </div>
    </AppShell>
  );
}
