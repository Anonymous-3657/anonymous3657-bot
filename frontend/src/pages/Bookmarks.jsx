import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ResourceCard } from "@/components/cards/ResourceCard";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { useBookmarks, PdfBookmarkButton } from "@/components/resources/BookmarkButton";
import { studentApi, pdfApi } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function Bookmarks() {
  const [items, setItems] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { ids, loaded } = useBookmarks();

  useSeo({ title: "My shelf — CG STUDENT PORTAL", path: "/bookmarks" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, pdfData] = await Promise.all([
        studentApi.bookmarks({ limit: 48 }),
        studentApi.bookmarkPdfs().catch(() => ({ items: [] })),
      ]);
      setItems(data.items);
      setPdfs(pdfData.items);
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
  const keep = (id) => !loaded || ids.includes(id);
  const visible = items.filter((r) => keep(r.id));
  const visiblePdfs = pdfs.filter((p) => keep(p.id));

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
        ) : pdfs.length === 0 ? (
          <EmptyState
            title="Your shelf is empty"
            description="Tap the bookmark icon on any resource or PDF to save it here."
            actionLabel="Browse resources"
            actionTo="/resources"
          />
        ) : null}

        {visiblePdfs.length > 0 && (
          <section className="mt-14" aria-labelledby="shelf-pdfs">
            <h2 id="shelf-pdfs" className="font-heading text-xl font-semibold text-fg">
              Saved PDFs
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="shelf-pdf-list">
              {visiblePdfs.map((p) => (
                <li
                  key={p.id}
                  data-testid={`shelf-pdf-${p.id}`}
                  className="rounded-2xl border border-brand-line bg-brand-surface p-5"
                >
                  <p className="font-heading text-sm font-semibold text-fg">{p.title}</p>
                  <p className="mt-1.5 text-xs text-muted">
                    {p.subject} · {p.semester}
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <a
                      href={pdfApi.fileUrl(p.id)}
                      target="_blank"
                      rel="noreferrer"
                      data-testid={`shelf-pdf-open-${p.id}`}
                      className="text-sm text-brand-primary hover:text-fg"
                    >
                      Open PDF
                    </a>
                    <PdfBookmarkButton pdfId={p.id} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
