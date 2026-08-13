import { useEffect, useState } from "react";
import { api, syllabusApi } from "@/services/api";
import { fmtDate, fmtBytes } from "@/utils/format";

export default function SyllabusPage() {
  const [filters, setFilters] = useState({ category: "", course: "", semester: "", subject_name: "", academic_session: "" });
  const [lists, setLists] = useState({ categories: [], courses: [], subjects: [] });
  const [data, setData] = useState(null);

  const loadLists = async () => {
    try {
      const [cats, courses] = await Promise.all([api.categories(), api.courses({ limit: 200 })]);
      setLists({ categories: cats.items || [], courses: courses.items || [], subjects: [] });
    } catch (e) {
      // ignore
    }
  };

  const load = async () => {
    try {
      const d = await api.syllabus(filters);
      setData(d);
    } catch (e) {
      setData({ items: [] });
    }
  };

  useEffect(() => {
    loadLists();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div className="container-page py-8">
      <h1 className="font-heading text-2xl font-semibold">Syllabi</h1>
      <p className="text-sm text-muted mt-2">Browse published syllabi by category, course and subject.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="rounded-xl border px-3 py-2">
          <option value="">All categories</option>
          {lists.categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={filters.course} onChange={(e) => setFilters({ ...filters, course: e.target.value })} className="rounded-xl border px-3 py-2">
          <option value="">All courses</option>
          {lists.courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <input placeholder="Subject" value={filters.subject_name} onChange={(e) => setFilters({ ...filters, subject_name: e.target.value })} className="rounded-xl border px-3 py-2" />
      </div>

      <div className="mt-6">
        {data?.items?.length === 0 ? (
          <p className="text-muted">No published syllabi found.</p>
        ) : (
          <ul className="space-y-4">
            {data?.items?.map((it) => (
              <li key={it.id} className="rounded-2xl border border-brand-line bg-brand-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading text-base font-semibold">{it.subject_name}</p>
                    <p className="mt-1 text-sm text-muted">{it.course} · {it.semester || it.year} · {it.academic_session}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={syllabusApi.preview(it.id)} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2">View</a>
                    <a href={syllabusApi.download(it.id)} target="_blank" rel="noreferrer" className="rounded-xl border px-3 py-2">Download</a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
