import { useEffect, useState } from "react";
import { Check, ExternalLink, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { errorMessage } from "@/context/AuthContext";
import { adminApi, pdfApi } from "@/services/api";
import { fmtBytes, fmtDate } from "@/utils/format";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

export default function AdminPdfs() {
  const [tab, setTab] = useState("pending");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (status = tab) => {
    setData(null);
    setError(null);
    try {
      setData(await adminApi.pdfs(status ? { status } : undefined));
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const approve = async (item) => {
    try {
      await adminApi.approvePdf(item.id);
      toast.success("Approved — now visible to students");
      load(tab);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const reject = async (e) => {
    e.preventDefault();
    if (reason.trim().length < 5) return;
    setBusy(true);
    try {
      await adminApi.rejectPdf(rejecting.id, reason.trim());
      toast.success("Rejected with feedback");
      setRejecting(null);
      setReason("");
      load(tab);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}" permanently from the portal?`)) return;
    try {
      await adminApi.deletePdf(item.id);
      toast.success("Document deleted");
      load(tab);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <AdminLayout
      title="PDF approval"
      description="Review student uploads. Only approved documents become available to students."
    >
      <div className="flex flex-wrap gap-2" data-testid="admin-pdfs-tabs">
        {TABS.map((t) => (
          <button
            key={t.key || "all"}
            type="button"
            onClick={() => setTab(t.key)}
            data-testid={`admin-pdfs-tab-${t.key || "all"}`}
            className={`min-h-[44px] rounded-xl border px-5 font-heading text-sm transition-colors duration-200 ${
              tab === t.key
                ? "border-brand-primary bg-brand-primary/10 text-fg"
                : "border-brand-line bg-brand-surface text-muted hover:text-fg"
            }`}
          >
            {t.label}
            {data?.counts?.[t.key] != null && (
              <span className="ml-2 text-xs text-muted">{data.counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {error ? (
          <ErrorState onRetry={() => load(tab)} />
        ) : !data ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            title="Nothing to review here"
            description="Student uploads waiting for a decision will show up in this queue."
          />
        ) : (
          <ul className="space-y-4" data-testid="admin-pdfs-list">
            {data.items.map((item) => (
              <li
                key={item.id}
                data-testid={`admin-pdf-row-${item.id}`}
                className="rounded-2xl border border-brand-line bg-brand-surface p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-heading text-base font-semibold text-fg">{item.title}</p>
                    <p className="mt-1.5 text-sm text-muted">
                      {item.subject} · {item.semester}
                      {item.session ? ` · ${item.session}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {item.uploader_name} · {item.uploader_email}
                    </p>
                    <p className="mt-1 text-xs text-muted/70">
                      {item.college_name || "College not set"} · {fmtDate(item.uploaded_at)} ·{" "}
                      {fmtBytes(item.file_size)}
                    </p>
                    {item.rejection_reason && (
                      <p className="mt-3 text-sm text-brand-error">
                        Rejected: {item.rejection_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={pdfApi.fileUrl(item.id)}
                      target="_blank"
                      rel="noreferrer"
                      data-testid={`admin-pdf-view-${item.id}`}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-brand-line px-4 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      View PDF
                    </a>
                    {item.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => approve(item)}
                        data-testid={`admin-pdf-approve-${item.id}`}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-brand-success/15 px-4 font-heading text-sm text-brand-success transition-colors duration-200 hover:bg-brand-success/25"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Approve
                      </button>
                    )}
                    {item.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => {
                          setRejecting(item);
                          setReason("");
                        }}
                        data-testid={`admin-pdf-reject-${item.id}`}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-brand-line px-4 font-heading text-sm text-muted transition-colors duration-200 hover:border-brand-error/50 hover:text-brand-error"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Reject
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      data-testid={`admin-pdf-delete-${item.id}`}
                      aria-label={`Delete ${item.title}`}
                      className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:border-brand-error/50 hover:text-brand-error"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rejecting && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reject document"
        >
          <form
            onSubmit={reject}
            data-testid="admin-pdf-reject-form"
            className="w-full max-w-lg rounded-2xl border border-brand-line bg-brand-surface p-7"
          >
            <h2 className="font-heading text-lg font-semibold text-fg">Reject this document</h2>
            <p className="mt-1.5 text-sm text-muted">
              The student will see this reason on their uploads page.
            </p>
            <textarea
              rows={4}
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="admin-pdf-reject-reason"
              placeholder="e.g. Pages 4-6 are unreadable. Please re-scan and upload again."
              className="mt-5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="min-h-[44px] rounded-xl border border-brand-line px-5 font-heading text-sm text-fg hover:bg-brand-elevated"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || reason.trim().length < 5}
                data-testid="admin-pdf-reject-submit"
                className="min-h-[44px] rounded-xl bg-brand-error px-6 font-heading text-sm font-medium text-white disabled:opacity-60"
              >
                Reject document
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
