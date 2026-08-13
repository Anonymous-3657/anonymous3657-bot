import { useEffect, useState } from "react";
import { teacherContentApi, api } from "@/services/api";

export default function TeacherLanding() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ content_type: "", university_id: "", q: "" });

  useEffect(() => {
    const load = async () => setData(await teacherContentApi.list({ limit: 24 }));
    load();
  }, []);

  return (
    <div className="container-page py-8">
      <h1 className="font-heading text-2xl font-semibold">Teacher Content</h1>
      <p className="text-sm text-muted mt-2">Articles, stories, poems and educational notes by teachers.</p>
      <div className="mt-6">
        {data?.items?.map((it) => (
          <div key={it.id} className="rounded-2xl border p-4 mb-4">
            <div className="font-heading text-lg font-semibold">{it.title}</div>
            <div className="text-sm text-muted">{it.content_type} · {it.published_at}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
