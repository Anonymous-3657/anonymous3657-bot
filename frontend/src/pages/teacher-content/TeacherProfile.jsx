import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { teacherContentApi } from "@/services/api";

export default function TeacherProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const load = async () => setProfile(await teacherContentApi.teacherProfile(id));
    if (id) load();
  }, [id]);

  if (!profile) return <div className="container-page py-8">Loading…</div>;
  return (
    <div className="container-page py-8">
      <div className="flex gap-6">
        <img src={profile.photo_url} alt={profile.name} className="h-28 w-28 rounded-full object-cover" />
        <div>
          <h1 className="font-heading text-2xl font-semibold">{profile.name}</h1>
          <div className="text-sm text-muted">{profile.designation} · {profile.institution}</div>
          <p className="mt-3 text-sm text-muted">{profile.bio}</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="font-heading text-lg font-semibold">Contents</h2>
        <ul className="mt-4 space-y-3">
          {profile.contents.map((c) => (
            <li key={c.id} className="rounded-2xl border p-3">{c.title} · {c.content_type}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
