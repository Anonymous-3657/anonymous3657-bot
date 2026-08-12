import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ResourceCard } from "@/components/cards/ResourceCard";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { useBookmarks } from "@/components/resources/BookmarkButton";
import { studentApi } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function Bookmarks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { ids } = useBookmarks();

  useSeo({ title: "My shelf — CG STUDENT PORTAL", path: "/bookmarks" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentApi.bookmarks({ limit: 48 });
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

  // Reflect un-saving immediately without a refetch.
  const visible = items.filter((r) => ids.length === 0 || ids.includes(r.id));

  return (
    <AppShell>
      <PageHeader
        title="My shelf"
        description="Every paper and note you saved, in one place."
        breadcrumbs={<Breadcrumbs items={[{ label: "My shelf" }]} />}
      />
      <div className="container-page py-14" data-testid="bookmarks-page">
        {loading ? (
          <CardSkeletonGrid count={3} />
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : visible.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your shelf is empty"
            description="Tap the bookmark icon on any resource to save it here."
            actionLabel="Browse resources"
            actionTo="/resources"
          />
        )}
      </div>
    </AppShell>
  );
}
