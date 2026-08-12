import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { errorMessage } from "@/context/AuthContext";
import { pdfApi } from "@/services/api";
import { fmtBytes, fmtDate } from "@/utils/format";
import { useSeo } from "@/hooks/useSeo";

const TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export const StatusPill = ({ status }) => {
  const tone = {
    pending: "border-brand-warning/40 bg-brand-warning/10 text-brand-warning",
    approved: "border-brand-success/40 bg-brand-success/10 text-brand-success",
    rejected: "border-brand-error/40 bg-brand-error/10 text-brand-error",
  }[status];
  return (
    <span
      data-testid={`pdf-status-${status}`}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs capitalize ${tone}`}
    >
      {status}
    </span>
  );
};

export default function MyUploads() {
  const [tab, setTab] = useState("");
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useSeo({ title: "My uploads — CG STUDENT PORTAL", path: "/dashboard/uploads" });

  const load = async (status = tab) => {
    setItems(null);
    setError(null);
    try {
      const data = await pdfApi.mine(status ? { status } : undefined);
      setItems(data.items);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const remove = async (item) => {
    if (!window.confirm(`Remove "${item.title}"?`)) return;
    try {
      await pdfApi.remove(item.id);
      toast.success("Upload removed");
      load(tab);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="My uploads"
        description="Track the review status of every PDF you shared."
        breadcrumbs={
          <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "My uploads" }]} />
        }
      />

      <div className="container-page py-12" data-testid="my-uploads-page">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key || "all"}
                type="button"
                onClick={() => setTab(t.key)}
                data-testid={`uploads-tab-${t.key || "all"}`}
                className={`min-h-[44px] rounded-xl border px-5 font-heading text-sm transition-colors duration-200 ${
                  tab === t.key
                    ? "border-brand-primary bg-brand-primary/10 text-fg"
                    : "border-brand-line bg-brand-surface text-muted hover:text-fg"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Link
            to="/dashboard/uploads/new"
            data-testid="uploads-new-link"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-primary px-5 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Upload PDF
          </Link>
        </div>

        <div className="mt-8">
          {error ? (
            <ErrorState onRetry={() => load(tab)} />
          ) : !items ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-20 w-full" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="Nothing uploaded yet"
              description="Share your notes or a question paper — juniors will thank you."
              actionLabel="Upload a PDF"
              actionTo="/dashboard/uploads/new"
            />
          ) : (
            <ul className="space-y-4" data-testid="uploads-list">
              {items.map((item) => (
                <li
                  key={item.id}
                  data-testid={`upload-row-${item.id}`}
                  className="rounded-2xl border border-brand-line bg-brand-surface p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-heading text-base font-semibold text-fg">{item.title}</p>
                      <p className="mt-1.5 text-sm text-muted">
                        {item.subject} · {item.semester}
                        {item.session ? ` · ${item.session}` : ""} ·{" "}
                        {fmtBytes(item.file_size)}
                      </p>
                      <p className="mt-1 text-xs text-muted/70">
                        Uploaded {fmtDate(item.uploaded_at)}
                      </p>
                      {item.status === "rejected" && item.rejection_reason && (
                        <p
                          data-testid={`upload-reason-${item.id}`}
                          className="mt-3 rounded-xl border border-brand-error/40 bg-brand-error/10 px-4 py-2 text-sm text-brand-error"
                        >
                          Reason: {item.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill status={item.status} />
                      <a
                        href={pdfApi.fileUrl(item.id)}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`upload-view-${item.id}`}
                        aria-label={`View ${item.title}`}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:text-fg"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                      {item.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => remove(item)}
                          data-testid={`upload-delete-${item.id}`}
                          aria-label={`Remove ${item.title}`}
                          className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:border-brand-error/50 hover:text-brand-error"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
