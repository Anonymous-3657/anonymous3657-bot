import { useEffect, useState, useCallback } from "react";
import { Check, Download, ExternalLink, Trash2, X, CheckSquare, Square, Upload } from "lucide-react";
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
  const [selected, setSelected] = useState(new Set());
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  const load = useCallback(async (status = tab) => {
    setData(null);
    setError(null);
    setSelected(new Set());
    try {
      setData(await adminApi.pdfs(status ? { status } : undefined));
    } catch (e) {
      setError(e);
    }
  }, [tab]);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const approve = async (item) => {
    try {
      await adminApi.approvePdf(item.id);
      toast.success(`Approved "${item.title}"`);
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
    if (!window.confirm(`Delete "${item.title}" permanently?`)) return;
    try {
      await adminApi.deletePdf(item.id);
      toast.success("Document deleted");
      load(tab);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  /* ---------- Selection ---------- */
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data?.items) return;
    if (selected.size === data.items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.items.map(item => item.id)));
    }
  };

  /* ---------- Bulk Actions ---------- */
  const bulkApprove = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const result = await adminApi.bulkPdfAction("approve", Array.from(selected));
      toast.success(`Approved ${result.success} PDFs${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
      setSelected(new Set());
      load(tab);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const bulkReject = async () => {
    if (bulkRejectReason.trim().length < 5) return;
    setBusy(true);
    try {
      const result = await adminApi.bulkPdfAction("reject", Array.from(selected), bulkRejectReason.trim());
      toast.success(`Rejected ${result.success} PDFs${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
      setBulkRejectOpen(false);
      setBulkRejectReason("");
      setSelected(new Set());
      load(tab);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.size} PDFs permanently?`)) return;
    setBusy(true);
    try {
      const result = await adminApi.bulkPdfAction("delete", Array.from(selected));
      toast.success(`Deleted ${result.success} PDFs${result.failed > 0 ? `, ${result.failed} failed` : ""}`);
      setSelected(new Set());
      load(tab);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title="PDF approval"
      description="Review student uploads. Approve to make them publicly downloadable."
    >
      {/* Tabs + Selection Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                <span className="ml-2 text-xs text-muted">({data.counts[t.key]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Export button */}
        <a
          href={adminApi.exportPdfs(tab || undefined)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-brand-line px-4 py-2 text-sm text-muted transition-colors hover:text-fg"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand-primary/30 bg-brand-primary/5 px-5 py-3" data-testid="admin-bulk-bar">
          <span className="text-sm font-medium text-fg">
            {selected.size} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={bulkApprove}
              disabled={busy}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-brand-success/15 px-3 font-heading text-xs text-brand-success transition-colors hover:bg-brand-success/25 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              Approve All
            </button>
            <button
              type="button"
              onClick={() => setBulkRejectOpen(true)}
              disabled={busy}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-brand-line px-3 font-heading text-xs text-muted transition-colors hover:text-fg disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              Reject All
            </button>
            <button
              type="button"
              onClick={bulkDelete}
              disabled={busy}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-brand-line px-3 font-heading text-xs text-muted transition-colors hover:border-brand-error/50 hover:text-brand-error disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete All
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 font-heading text-xs text-muted transition-colors hover:text-fg"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
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
          <>
            {/* Select All */}
            <button
              type="button"
              onClick={toggleSelectAll}
              className="mb-3 flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors"
            >
              {selected.size === data.items.length ? (
                <CheckSquare className="h-4 w-4 text-brand-primary" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {selected.size === data.items.length ? "Deselect all" : "Select all"}
            </button>

            <ul className="space-y-3" data-testid="admin-pdfs-list">
              {data.items.map((item) => (
                <li
                  key={item.id}
                  data-testid={`admin-pdf-row-${item.id}`}
                  className={`rounded-2xl border bg-brand-surface p-5 transition-colors ${
                    selected.has(item.id)
                      ? "border-brand-primary/50 bg-brand-primary/5"
                      : "border-brand-line"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelect(item.id)}
                        className="mt-1 flex-shrink-0"
                        aria-label={`Select ${item.title}`}
                      >
                        {selected.has(item.id) ? (
                          <CheckSquare className="h-5 w-5 text-brand-primary" />
                        ) : (
                          <Square className="h-5 w-5 text-muted" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-heading text-sm font-semibold text-fg truncate">{item.title}</p>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.status === "approved" ? "bg-green-500/10 text-green-600" :
                            item.status === "rejected" ? "bg-red-500/10 text-red-600" :
                            "bg-amber-500/10 text-amber-600"
                          }`}>
                            {item.status}
                          </span>
                          {item.downloads > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
                              <Download className="h-3 w-3" />
                              {item.downloads}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted">
                          {item.subject} · {item.semester}
                          {item.session ? ` · ${item.session}` : ""}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">
                          {item.uploader_name} · {item.uploader_email}
                        </p>
                        <p className="mt-0.5 text-xs text-muted/70">
                          {item.college_name || "College not set"} · {fmtDate(item.uploaded_at)} ·{" "}
                          {fmtBytes(item.file_size)}
                        </p>
                        {item.rejection_reason && (
                          <p className="mt-2 text-sm text-brand-error">
                            Reason: {item.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                      <a
                        href={pdfApi.fileUrl(item.id)}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`admin-pdf-view-${item.id}`}
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-brand-line px-3.5 font-heading text-xs text-fg transition-colors duration-200 hover:bg-brand-elevated"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </a>
                      <a
                        href={pdfApi.publicDownloadUrl(item.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-brand-line px-3.5 font-heading text-xs text-fg transition-colors duration-200 hover:bg-brand-elevated"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                      {item.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => approve(item)}
                          data-testid={`admin-pdf-approve-${item.id}`}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-brand-success/15 px-3.5 font-heading text-xs text-brand-success transition-colors duration-200 hover:bg-brand-success/25"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      )}
                      {item.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => { setRejecting(item); setReason(""); }}
                          data-testid={`admin-pdf-reject-${item.id}`}
                          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-brand-line px-3.5 font-heading text-xs text-muted transition-colors duration-200 hover:border-brand-error/50 hover:text-brand-error"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        data-testid={`admin-pdf-delete-${item.id}`}
                        aria-label={`Delete ${item.title}`}
                        className="grid h-[38px] w-[38px] place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:border-brand-error/50 hover:text-brand-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Reject Modal (single) */}
      {rejecting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <form onSubmit={reject} data-testid="admin-pdf-reject-form" className="w-full max-w-lg rounded-2xl border border-brand-line bg-brand-surface p-7">
            <h2 className="font-heading text-lg font-semibold text-fg">Reject document</h2>
            <p className="mt-1.5 text-sm text-muted">The student will see this reason on their uploads page.</p>
            <textarea
              rows={4} autoFocus value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="admin-pdf-reject-reason"
              placeholder="e.g. Pages 4-6 are unreadable."
              className="mt-5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setRejecting(null)} className="min-h-[44px] rounded-xl border border-brand-line px-5 font-heading text-sm text-fg hover:bg-brand-elevated">Cancel</button>
              <button type="submit" disabled={busy || reason.trim().length < 5} data-testid="admin-pdf-reject-submit" className="min-h-[44px] rounded-xl bg-brand-error px-6 font-heading text-sm font-medium text-white disabled:opacity-60">Reject</button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk Reject Modal */}
      {bulkRejectOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-brand-line bg-brand-surface p-7">
            <h2 className="font-heading text-lg font-semibold text-fg">Bulk reject {selected.size} documents</h2>
            <p className="mt-1.5 text-sm text-muted">A single reason will be applied to all selected PDFs.</p>
            <textarea
              rows={4} autoFocus value={bulkRejectReason}
              onChange={(e) => setBulkRejectReason(e.target.value)}
              placeholder="e.g. Duplicate content. Please upload original material."
              className="mt-5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setBulkRejectOpen(false)} className="min-h-[44px] rounded-xl border border-brand-line px-5 font-heading text-sm text-fg hover:bg-brand-elevated">Cancel</button>
              <button type="button" onClick={bulkReject} disabled={busy || bulkRejectReason.trim().length < 5} className="min-h-[44px] rounded-xl bg-brand-error px-6 font-heading text-sm font-medium text-white disabled:opacity-60">
                Reject {selected.size} PDFs
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
