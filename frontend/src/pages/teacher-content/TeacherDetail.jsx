import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { teacherContentApi } from "@/services/api";

export default function TeacherDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    const load = async () => setItem(await teacherContentApi.detail(id));
    if (id) load();
  }, [id]);

  if (!item) return <div className="container-page py-8">Loading…</div>;
  return (
    <div className="container-page py-8">
      <h1 className="font-heading text-2xl font-semibold">{item.title}</h1>
      <div className="mt-4 text-sm text-muted">{item.content_type} · {item.published_at}</div>
      <div className="mt-6" dangerouslySetInnerHTML={{ __html: item.content_html || "" }} />
    </div>
  );
}
