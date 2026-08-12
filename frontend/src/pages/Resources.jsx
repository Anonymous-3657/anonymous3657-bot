import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SearchInput } from "@/components/common/SearchInput";
import { ResourceCard } from "@/components/cards/ResourceCard";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { api } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

const PAGE_SIZE = 12;
const SORTS = [
  { value: "recent", label: "Recent" },
  { value: "popular", label: "Most viewed" },
  { value: "downloads", label: "Most downloaded" },
];

export default function Resources() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [sort, setSort] = useState(params.get("sort") || "recent");
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], total: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categoryId = params.get("category_id") || "";
  const universityId = params.get("university_id") || "";
  const subjectId = params.get("subject_id") || "";

  useSeo({
    title: "Study Resources — CG STUDENT PORTAL",
    description: "Search question papers, notes and syllabus across universities and courses.",
    path: "/resources",
  });

  useEffect(() => {
    api.categories().then((d) => setCategories(d.items)).catch(() => setCategories([]));
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.resources({
        q: params.get("q") || undefined,
        category_id: categoryId || undefined,
        university_id: universityId || undefined,
        subject_id: subjectId || undefined,
        sort,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      });
      setData(res);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString(), sort, page]);

  const applyParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setPage(0);
    setParams(next);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <AppShell>
      <PageHeader
        title="Study resources"
        description="Filter by category, then narrow down to your course and subject."
        breadcrumbs={<Breadcrumbs items={[{ label: "Resources" }]} />}
      />

      <div className="container-page py-12" data-testid="resources-page">
        <div className="max-w-2xl">
          <SearchInput
            value={query}
            onChange={setQuery}
            onSubmit={(v) => applyParam("q", v.trim())}
            testId="resources-search-input"
            submitTestId="resources-search-submit"
          />
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside aria-label="Filters" className="space-y-6">
            <div>
              <h2 className="font-heading text-sm font-semibold text-fg">Category</h2>
              <div className="mt-4 flex flex-wrap gap-2 lg:flex-col">
                <button
                  type="button"
                  onClick={() => applyParam("category_id", "")}
                  data-testid="filter-category-all"
                  aria-pressed={!categoryId}
                  className={`min-h-[44px] rounded-xl border px-4 text-left font-heading text-sm transition-colors duration-200 ${
                    !categoryId
                      ? "border-brand-primary bg-brand-primary/10 text-fg"
                      : "border-brand-line bg-brand-surface text-muted hover:text-fg"
                  }`}
                >
                  All categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => applyParam("category_id", c.id)}
                    data-testid={`filter-category-${c.slug}`}
                    aria-pressed={categoryId === c.id}
                    className={`min-h-[44px] rounded-xl border px-4 text-left font-heading text-sm transition-colors duration-200 ${
                      categoryId === c.id
                        ? "border-brand-primary bg-brand-primary/10 text-fg"
                        : "border-brand-line bg-brand-surface text-muted hover:text-fg"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-heading text-sm font-semibold text-fg">Sort</h2>
              <div className="mt-4 flex flex-wrap gap-2 lg:flex-col">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setSort(s.value);
                      setPage(0);
                    }}
                    data-testid={`filter-sort-${s.value}`}
                    aria-pressed={sort === s.value}
                    className={`min-h-[44px] rounded-xl border px-4 text-left font-heading text-sm transition-colors duration-200 ${
                      sort === s.value
                        ? "border-brand-primary bg-brand-primary/10 text-fg"
                        : "border-brand-line bg-brand-surface text-muted hover:text-fg"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div>
            <p className="mb-6 text-sm text-muted" data-testid="resources-result-count">
              {loading ? "Loading resources…" : `${data.total} resource${data.total === 1 ? "" : "s"} found`}
            </p>

            {loading ? (
              <CardSkeletonGrid count={6} />
            ) : error ? (
              <ErrorState onRetry={load} />
            ) : data.items.length ? (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.items.map((r) => (
                    <ResourceCard key={r.id} resource={r} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav aria-label="Pagination" className="mt-10 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      data-testid="pagination-prev"
                      className="min-h-[44px] rounded-xl border border-brand-line bg-brand-surface px-5 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted" data-testid="pagination-status">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      data-testid="pagination-next"
                      className="min-h-[44px] rounded-xl border border-brand-line bg-brand-surface px-5 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated disabled:opacity-40"
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <EmptyState
                title="No study materials found for this filter yet."
                description="Try clearing filters or searching a different subject."
                actionLabel="Clear filters"
                onAction={() => {
                  setQuery("");
                  setParams(new URLSearchParams());
                  setPage(0);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
