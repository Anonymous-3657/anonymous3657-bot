import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState, ErrorState, NotFoundState } from "@/components/common/StateViews";
import { api } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function CourseDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useSeo({
    title: data ? `${data.course.name} — CG STUDENT PORTAL` : "Course — CG STUDENT PORTAL",
    description: data ? `Subjects and study material for ${data.course.name}.` : undefined,
    path: `/courses/${slug}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.course(slug));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  if (error?.response?.status === 404) {
    return (
      <AppShell>
        <div className="container-page py-24">
          <NotFoundState />
        </div>
      </AppShell>
    );
  }

  const grouped = (data?.subjects || []).reduce((acc, s) => {
    const key = s.semester_or_year || "Unassigned";
    acc[key] = acc[key] || [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <AppShell>
      <PageHeader
        title={data?.course?.name || (loading ? "Loading…" : "Course")}
        description={
          data?.course
            ? [data.course.course_type, data.course.duration].filter(Boolean).join(" • ")
            : undefined
        }
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Courses", to: "/courses" }, { label: data?.course?.short_name || slug }]}
          />
        }
      />
      <div className="container-page py-14" data-testid="course-detail-page">
        {loading ? (
          <div className="space-y-4">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : Object.keys(grouped).length ? (
          <div className="space-y-12">
            {Object.entries(grouped).map(([semester, subjects]) => (
              <section key={semester} aria-label={semester}>
                <h2 className="font-heading text-lg font-semibold text-fg">{semester}</h2>
                <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/resources?subject_id=${s.id}`}
                        data-testid={`subject-item-${s.code || s.id}`}
                        className="block h-full rounded-2xl border border-brand-line bg-brand-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-brand-primary/50"
                      >
                        <p className="font-heading text-sm font-semibold text-fg">{s.name}</p>
                        <p className="mt-1.5 text-xs text-muted">{s.code}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="No subjects mapped to this course yet" />
        )}
      </div>
    </AppShell>
  );
}
