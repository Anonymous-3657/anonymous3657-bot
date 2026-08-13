import { useEffect, useState } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { teacherContentApi, adminApi } from "@/services/api";

export default function AdminTeacherContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ content_type: "article", status: "published" });

  const load = async () => {
    setLoading(true);
    try {
      setData(await teacherContentApi.adminList({ limit: 200 }));
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setForm({ content_type: "article", status: "published" });
    setCreating(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      ["teacher_id", "content_type", "title", "excerpt", "content_html", "tags", "featured", "status"].forEach((k) => {
        if (form[k] != null) fd.append(k, form[k]);
      });
      if (form.cover_image) fd.append("cover_image", form.cover_image);
      await teacherContentApi.createContent(fd);
      toast.success("Content created");
      setCreating(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || "Failed");
    }
  };

  return (
    <AdminLayout title="Teacher Content Management" description="Manage teacher profiles and published content.">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-white">
            <Plus className="h-4 w-4" /> New content
          </button>
        </div>
      </div>

      <div className="mt-6">
        {loading || !data ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-12 w-full" />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState title="No content" description="Create teacher content to get started." />
        ) : (
          <ul className="space-y-4">
            {data.items.map((it) => (
              <li key={it.id} className="rounded-2xl border border-brand-line bg-brand-surface p-4 flex justify-between">
                <div>
                  <div className="font-heading text-base font-semibold">{it.title}</div>
                  <div className="text-sm text-muted">{it.content_type} · {it.published_at}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-xl border px-3 py-2"><Edit className="h-4 w-4" /></button>
                  <button className="rounded-xl border px-3 py-2 text-brand-error"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8">
          <form onSubmit={save} className="w-full max-w-2xl rounded-2xl border border-brand-line bg-brand-surface p-7">
            <h2 className="font-heading text-lg font-semibold">New Teacher Content</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input placeholder="Teacher ID (existing)" value={form.teacher_id || ""} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })} className="rounded-xl border px-3 py-2" />
              <select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} className="rounded-xl border px-3 py-2">
                <option value="article">Article</option>
                <option value="story">Story</option>
                <option value="poem">Poem</option>
                <option value="song">Song</option>
                <option value="educational">Educational</option>
                <option value="other">Other</option>
              </select>
              <input placeholder="Title" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border px-3 py-2 sm:col-span-2" />
              <textarea placeholder="Excerpt" value={form.excerpt || ""} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="rounded-xl border px-3 py-2 sm:col-span-2" />
              <div className="sm:col-span-2">
                <label className="text-sm">Cover image</label>
                <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, cover_image: e.target.files?.[0] })} className="mt-2" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setCreating(false)} className="rounded-xl border px-4 py-2">Cancel</button>
              <button type="submit" className="rounded-xl bg-brand-primary px-4 py-2 text-white">Create</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
