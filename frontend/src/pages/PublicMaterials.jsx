import { useEffect, useState } from "react";
import { Download, Search, FileText, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { publicApi } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";
import { fmtBytes, fmtDate } from "@/utils/format";

export default function PublicPdfs() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("");
  const [sort, setSort] = useState("recent");

  useSeo({ title: "Study Materials — Free Downloads", path: "/materials" });

  const load = async () => {
    setLoading(true);
    try {
      const params = { sort, limit: 24 };
      if (q.trim()) params.q = q.trim();
      if (subject) params.subject = subject;
      if (semester) params.semester = semester;
      setData(await publicApi.pdfs(params));
    } catch (e) {
      setData({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [sort]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <div className="border-b border-brand-line bg-brand-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <h1 className="font-heading text-2xl font-bold text-fg sm:text-3xl">
            📚 Free Study Materials
          </h1>
          <p className="mt-2 text-muted">
            Browse and download approved study materials — no login required!
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Search & Filters */}
        <form onSubmit={handleSearch} className="rounded-2xl border border-brand-line bg-brand-surface p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or subject..."
                className="w-full rounded-xl border border-brand-line bg-brand-elevated py-3 pl-10 pr-4 text-sm text-fg outline-none focus:border-brand-primary"
              />
            </div>
            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 font-heading text-sm font-medium text-white"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              value={semester}
              onChange={(e) => { setSemester(e.target.value); }}
              className="rounded-lg border border-brand-line bg-brand-elevated px-3 py-2 text-sm text-fg outline-none"
            >
              <option value="">All Semesters</option>
              {["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-brand-line bg-brand-elevated px-3 py-2 text-sm text-fg outline-none"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Downloaded</option>
            </select>
          </div>
        </form>

        {/* Stats */}
        {data && (
          <p className="mt-4 text-sm text-muted">
            {data.total} materials available for free download
          </p>
        )}

        {/* Results */}
        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl border border-brand-line bg-brand-surface" />
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="rounded-2xl border border-brand-line bg-brand-surface p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted/50" />
              <h3 className="mt-4 font-heading text-lg font-semibold text-fg">No materials found</h3>
              <p className="mt-2 text-sm text-muted">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="public-pdfs-grid">
              {data.items.map((pdf) => (
                <div
                  key={pdf.id}
                  data-testid={`public-pdf-card-${pdf.id}`}
                  className="group rounded-2xl border border-brand-line bg-brand-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-primary/10">
                      <FileText className="h-5 w-5 text-brand-primary" />
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                      <Download className="h-3 w-3" />
                      {pdf.downloads || 0}
                    </span>
                  </div>

                  <h3 className="mt-3 font-heading text-sm font-semibold text-fg line-clamp-2">
                    {pdf.title}
                  </h3>

                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted">
                      {pdf.subject} · {pdf.semester}
                    </p>
                    {pdf.college_name && (
                      <p className="text-xs text-muted/70 truncate">{pdf.college_name}</p>
                    )}
                    <p className="text-xs text-muted/70">
                      {fmtBytes(pdf.file_size)} · {fmtDate(pdf.uploaded_at)}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <a
                      href={publicApi.pdfDownloadUrl(pdf.id)}
                      target="_blank"
                      rel="noreferrer"
                      data-testid={`public-pdf-download-${pdf.id}`}
                      className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-3 font-heading text-xs font-medium text-white transition-colors hover:bg-brand-primary/90"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Free Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
