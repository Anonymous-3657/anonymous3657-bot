import { useEffect, useState } from "react";
import { Megaphone, Plus, Edit3, Trash2, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { errorMessage } from "@/context/AuthContext";
import { adminApi } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

const TYPE_OPTIONS = [
  { value: "info", label: "Info", icon: Info, color: "text-blue-500 bg-blue-500/10" },
  { value: "success", label: "Success", icon: CheckCircle, color: "text-green-500 bg-green-500/10" },
  { value: "warning", label: "Warning", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10" },
  { value: "urgent", label: "Urgent", icon: AlertCircle, color: "text-red-500 bg-red-500/10" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Everyone" },
  { value: "students", label: "Students only" },
  { value: "staff", label: "Staff only" },
];

const emptyForm = {
  title: "",
  message: "",
  type: "info",
  priority: "normal",
  target_audience: "all",
  status: "active",
  publish_date: "",
  expires_at: "",
  link_url: "",
};

export default function AdminAnnouncements() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useSeo({ title: "Announcements — Admin", path: "/admin/announcements" });

  const load = async () => {
    setError(null);
    try {
      setData(await adminApi.announcements());
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      message: item.message || "",
      type: item.type || "info",
      priority: item.priority || "normal",
      target_audience: item.target_audience || "all",
      status: item.status || "active",
      publish_date: item.publish_date ? item.publish_date.slice(0, 16) : "",
      expires_at: item.expires_at ? item.expires_at.slice(0, 16) : "",
      link_url: item.link_url || "",
    });
    setFormOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        publish_date: form.publish_date ? new Date(form.publish_date).toISOString() : undefined,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      };
      if (editing) {
        await adminApi.updateAnnouncement(editing.id, body);
        toast.success("Announcement updated");
      } else {
        await adminApi.createAnnouncement(body);
        toast.success("Announcement created");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete announcement "${item.title}"?`)) return;
    try {
      await adminApi.deleteAnnouncement(item.id);
      toast.success("Announcement removed");
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const getTypeStyle = (type) => TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[0];

  return (
    <AdminLayout
      title="Announcements"
      description="Create public announcements visible to all users on the portal."
    >
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{data ? `${data.total} announcements` : ""}</p>
        <button
          type="button"
          onClick={openCreate}
          data-testid="admin-announcement-create"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-primary px-5 font-heading text-sm font-medium text-white transition-colors hover:bg-brand-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </div>

      {/* List */}
      <div className="mt-6">
        {error ? (
          <ErrorState onRetry={load} />
        ) : !data ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            title="No announcements yet"
            description="Create announcements to inform students about important updates."
          />
        ) : (
          <ul className="space-y-3" data-testid="admin-announcements-list">
            {data.items.map((item) => {
              const typeStyle = getTypeStyle(item.type);
              const TypeIcon = typeStyle.icon;
              return (
                <li key={item.id} className="rounded-2xl border border-brand-line bg-brand-surface p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-lg flex-shrink-0 ${typeStyle.color}`}>
                        <TypeIcon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-heading text-sm font-semibold text-fg">{item.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeStyle.color}`}>
                            {item.type}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${
                            item.status === "active" ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-500"
                          }`}>
                            {item.status}
                          </span>
                          {item.priority !== "normal" && (
                            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600">
                              {item.priority}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted line-clamp-2">{item.message}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted/70">
                          <span>For: {item.target_audience}</span>
                          <span>By: {item.created_by_name || "Admin"}</span>
                          {item.expires_at && <span>Expires: {item.expires_at.slice(0, 10)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-brand-line text-muted hover:text-fg transition-colors"
                        aria-label={`Edit ${item.title}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        className="grid h-9 w-9 place-items-center rounded-lg border border-brand-line text-muted hover:text-brand-error transition-colors"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Create/Edit Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <form onSubmit={save} className="w-full max-w-xl rounded-2xl border border-brand-line bg-brand-surface p-7 max-h-[90vh] overflow-y-auto">
            <h2 className="font-heading text-lg font-semibold text-fg">
              {editing ? "Edit Announcement" : "New Announcement"}
            </h2>

            <div className="mt-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-muted">Title *</label>
                <input
                  type="text" required minLength={3} maxLength={200}
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Exam schedule updated for Semester 3"
                  className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-muted">Message *</label>
                <textarea
                  rows={4} required minLength={10} maxLength={2000}
                  value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Detailed announcement content..."
                  className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                />
              </div>

              {/* Type + Priority */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted">Type</label>
                  <select
                    value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                  >
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted">Priority</label>
                  <select
                    value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Audience + Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted">Audience</label>
                  <select
                    value={form.target_audience} onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                  >
                    {AUDIENCE_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted">Status</label>
                  <select
                    value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted">Publish date</label>
                  <input
                    type="datetime-local"
                    value={form.publish_date} onChange={(e) => setForm({ ...form, publish_date: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted">Expires at</label>
                  <input
                    type="datetime-local"
                    value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-xs font-medium text-muted">Link URL (optional)</label>
                <input
                  type="url"
                  value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-[44px] rounded-xl border border-brand-line px-5 font-heading text-sm text-fg hover:bg-brand-elevated">Cancel</button>
              <button type="submit" disabled={saving} className="min-h-[44px] rounded-xl bg-brand-primary px-6 font-heading text-sm font-medium text-white disabled:opacity-60">
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
