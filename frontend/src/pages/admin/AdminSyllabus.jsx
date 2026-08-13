import { useEffect, useState } from "react";
import { ExternalLink, Eye, Download, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { adminApi, syllabusApi } from "@/services/api";
import { fmtBytes, fmtDate } from "@/utils/format";

export default function AdminSyllabus() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ status: "published" });
  const [refs, setRefs] = useState({ categories: [], courses: [], subjects: [] });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await syllabusApi.list({ limit: 200 });
      setData(d);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    Promise.all([
      adminApi.list("categories", { limit: 200 }).catch(() => ({ items: [] })),
      adminApi.list("courses", { limit: 200 }).catch(() => ({ items: [] })),
      adminApi.list("subjects", { limit: 200 }).catch(() => ({ items: [] })),
    ]).then(([c, cs, s]) => setRefs({ categories: c.items, courses: cs.items, subjects: s.items }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setForm({ status: "published" });
    setEditing({});
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      category: item.category || "",
      course: item.course || "",
      year: item.year || "",
      semester: item.semester || "",
      subject_name: item.subject_name || "",
      subject_code: item.subject_code || "",
      syllabus_title: item.syllabus_title || "",
      academic_session: item.academic_session || "",
      description: item.description || "",
      status: item.status || "published",
    });
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      // append fields
      [
        "category",
        "course",
        "year",
        "semester",
        "subject_name",
        "subject_code",
        "syllabus_title",
        "academic_session",
        "description",
        "status",
      ].forEach((k) => {
        if (form[k] != null) fd.append(k, form[k]);
      });
      if (form.file) fd.append("file", form.file);
      if (editing?.id) {
        await syllabusApi.update(editing.id, fd);
        toast.success("Syllabus updated");
      } else {
        await syllabusApi.create(fd);
        toast.success("Syllabus uploaded");
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Failed");
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.syllabus_title || item.subject_name}"?`)) return;
    try {
      await syllabusApi.delete(item.id);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Failed");
    }
  };

  const publish = async (item) => {
    try {
      if (item.status === "published") await syllabusApi.unpublish(item.id);
      else await syllabusApi.publish(item.id);
      toast.success("Status updated");
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Failed");
    }
  };

  return (
    <AdminLayout title="Syllabus Management" description="Upload and manage syllabus PDFs for courses and subjects.">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm text-white"
          >
            New syllabus
          </button>
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState onRetry={load} />
        ) : loading || !data ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState title="No syllabi" description="Upload the first syllabus to get started." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-line bg-brand-surface">
            <table className="w-full text-left min-w-[880px]">
              <thead>
                <tr className="border-b border-brand-line">
                  <th className="px-5 py-3 text-xs text-muted">Subject</th>
                  <th className="px-5 py-3 text-xs text-muted">Course</th>
                  <th className="px-5 py-3 text-xs text-muted">Semester</th>
                  <th className="px-5 py-3 text-xs text-muted">Session</th>
                  <th className="px-5 py-3 text-xs text-muted">Status</th>
                  <th className="px-5 py-3 text-xs text-muted">Uploaded</th>
                  <th className="px-5 py-3 text-xs text-muted text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="px-5 py-4">{it.subject_name}</td>
                    <td className="px-5 py-4">{it.course}</td>
                    <td className="px-5 py-4">{it.semester || it.year}</td>
                    <td className="px-5 py-4">{it.academic_session}</td>
                    <td className="px-5 py-4">{it.status}</td>
                    <td className="px-5 py-4">{it.uploaded_by_name} · {fmtDate(it.uploaded_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a href={syllabusApi.preview(it.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                          <Eye className="h-4 w-4" /> Preview
                        </a>
                        <a href={syllabusApi.download(it.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                          <Download className="h-4 w-4" /> Download
                        </a>
                        <button onClick={() => openEdit(it)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                          <Edit className="h-4 w-4" /> Edit
                        </button>
                        <button onClick={() => publish(it)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                          {it.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => remove(it)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-brand-error">
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8" role="dialog" aria-modal="true">
          <form onSubmit={save} className="w-full max-w-2xl rounded-2xl border border-brand-line bg-brand-surface p-7">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">{editing.id ? "Edit" : "New"} syllabus</h2>
              <button type="button" onClick={() => setEditing(null)} className="text-muted">Close</button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-fg">Category</label>
                <select value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2">
                  <option value="">Select</option>
                  {refs.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-fg">Course</label>
                <select value={form.course || ""} onChange={(e) => setForm({ ...form, course: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2">
                  <option value="">Select</option>
                  {refs.courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-fg">Semester / Year</label>
                <input value={form.semester || form.year || ""} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-fg">Subject</label>
                <input value={form.subject_name || ""} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-fg">Subject Code</label>
                <input value={form.subject_code || ""} onChange={(e) => setForm({ ...form, subject_code: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-fg">Academic session</label>
                <input value={form.academic_session || ""} onChange={(e) => setForm({ ...form, academic_session: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-fg">Title</label>
                <input value={form.syllabus_title || ""} onChange={(e) => setForm({ ...form, syllabus_title: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-fg">Description / Notes</label>
                <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-2xl border px-3 py-2" rows={3} />
              </div>
              <div>
                <label className="text-sm text-fg">PDF file</label>
                <input type="file" accept="application/pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} className="mt-2 w-full" />
              </div>
              <div>
                <label className="text-sm text-fg">Status</label>
                <select value={form.status || "published"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-xl border px-3 py-2">
                  <option value="published">Published</option>
                  <option value="unpublished">Unpublished</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2">Cancel</button>
              <button type="submit" className="rounded-xl bg-brand-primary px-4 py-2 text-white">{editing.id ? "Save" : "Upload"}</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
