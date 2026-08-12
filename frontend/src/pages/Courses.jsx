import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CourseCard } from "@/components/cards/CourseCard";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { api } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function Courses() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useSeo({
    title: "Courses — CG STUDENT PORTAL",
    description: "Browse university courses, semesters and subjects on CG STUDENT PORTAL.",
    path: "/courses",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.courses({ limit: 24, course_type: type || undefined });
      setItems(data.items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [type]);

  return (
    <AppShell>
      <PageHeader
        title="Courses"
        description="Pick a course to see its semester-wise subjects."
        breadcrumbs={<Breadcrumbs items={[{ label: "Courses" }]} />}
        right={
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by course type">
            {["", "UG", "PG"].map((t) => (
              <button
                key={t || "all"}
                type="button"
                onClick={() => setType(t)}
                data-testid={`course-type-filter-${t.toLowerCase() || "all"}`}
                aria-pressed={type === t}
                className={`min-h-[44px] rounded-xl border px-4 font-heading text-sm transition-colors duration-200 ${
                  type === t
                    ? "border-brand-primary bg-brand-primary text-white"
                    : "border-brand-line bg-brand-surface text-muted hover:text-fg"
                }`}
              >
                {t || "All"}
              </button>
            ))}
          </div>
        }
      />
      <div className="container-page py-14" data-testid="courses-page">
        {loading ? (
          <CardSkeletonGrid count={4} />
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : items.length ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {items.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState title="No courses found" description="Try a different course type filter." />
        )}
      </div>
    </AppShell>
  );
}
