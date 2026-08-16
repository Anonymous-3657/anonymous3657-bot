import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { teacherContentApi } from '@/services/api';

const sanitizeHtml = (value = '') => {
  if (typeof window === 'undefined') return value;
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');

  doc.querySelectorAll('script, style, iframe, object, embed').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
      }
      if ((name === 'href' || name === 'src') && attr.value) {
        const next = attr.value.trim();
        if (/^javascript:/i.test(next) || /^data:/i.test(next)) {
          node.removeAttribute(attr.name);
        }
      }
    });
  });

  return doc.body.innerHTML;
};

export default function TeacherDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);

  useEffect(() => {
    const load = async () => {
      const detail = await teacherContentApi.detail(id);
      setItem(detail);
    };
    if (id) load();
  }, [id]);

  const contentHtml = useMemo(() => sanitizeHtml(item?.content_html || ''), [item?.content_html]);

  if (!item) return <div className="container-page py-8">Loading…</div>;

  return (
    <div className="container-page py-8">
      <h1 className="font-heading text-2xl font-semibold">{item.title}</h1>
      <div className="mt-4 text-sm text-muted">{item.content_type} · {item.published_at}</div>
      <div className="mt-6" dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </div>
  );
}
