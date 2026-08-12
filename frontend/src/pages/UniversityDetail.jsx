import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CourseCard } from "@/components/cards/CourseCard";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { EmptyState, ErrorState, NotFoundState } from "@/components/common/StateViews";
import { DemoBadge } from "@/components/common/DemoBadge";
import { api } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function UniversityDetail() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useSeo({
    title: data ? `${data.university.name} — CG STUDENT PORTAL` : "University — CG STUDENT PORTAL",
    description: data?.university?.description,
    path: `/universities/${slug}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.university(slug));
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

  return (
    <AppShell>
      <PageHeader
        title={data?.university?.name || (loading ? "Loading…" : "University")}
        description={data?.university?.description}
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Universities", to: "/universities" },
              { label: data?.university?.short_name || slug },
            ]}
          />
        }
        right={
          data?.university?.official_website && (
            <a
              href={data.university.official_website}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="university-official-site"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-brand-line bg-brand-surface px-5 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated"
            >
              Official website <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )
        }
      />

      <div className="container-page py-14" data-testid="university-detail-page">
        {loading ? (
          <CardSkeletonGrid count={3} />
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : (
          <div className="space-y-14">
            {data.university.is_demo && <DemoBadge />}

            <section aria-labelledby="uni-courses">
              <div className="flex items-center justify-between gap-4">
                <h2 id="uni-courses" className="font-heading text-xl font-semibold text-fg">
                  Courses
                </h2>
                <Link
                  to={`/resources?university_id=${data.university.id}`}
                  data-testid="university-resources-link"
                  className="text-sm text-brand-primary transition-colors duration-200 hover:text-fg"
                >
                  {data.resource_count} resources
                </Link>
              </div>
              <div className="mt-6">
                {data.courses.length ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {data.courses.map((c) => (
                      <CourseCard key={c.id} course={c} />
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No courses added for this university yet" />
                )}
              </div>
            </section>

            <section aria-labelledby="uni-colleges">
              <h2 id="uni-colleges" className="font-heading text-xl font-semibold text-fg">
                Affiliated colleges
              </h2>
              <div className="mt-6">
                {data.colleges.length ? (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {data.colleges.map((c) => (
                      <li
                        key={c.id}
                        data-testid={`college-item-${c.slug}`}
                        className="rounded-2xl border border-brand-line bg-brand-surface p-6"
                      >
                        <p className="font-heading text-sm font-semibold text-fg">{c.name}</p>
                        <p className="mt-1.5 text-xs text-muted">{c.address || c.city}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No colleges added yet" />
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
