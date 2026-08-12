import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BadgeCheck, BookOpen, Building2, FileText, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Reveal } from "@/components/common/Reveal";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { ResourceCard } from "@/components/cards/ResourceCard";
import { EmptyState } from "@/components/common/StateViews";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

const UPCOMING = [
  { label: "Bookmarks", detail: "Save papers and notes for later" },
  { label: "My downloads", detail: "Everything you have opened" },
  { label: "My uploads", detail: "Share notes and help juniors" },
  { label: "Notifications", detail: "Exam and result alerts" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useSeo({ title: "My dashboard — CG STUDENT PORTAL", path: "/dashboard" });

  useEffect(() => {
    const load = async () => {
      const [course, resources] = await Promise.all([
        user.course_id
          ? api.courses({ limit: 100 }).then((d) => d.items.find((c) => c.id === user.course_id))
          : Promise.resolve(null),
        api.resources({
          limit: 6,
          sort: "recent",
          university_id: user.university_id || undefined,
        }),
      ]);
      setData({ course, resources: resources.items });
    };
    load();
  }, [user.course_id, user.university_id]);

  return (
    <AppShell>
      <PageHeader
        title={`Hi ${user.name?.split(" ")[0] || "student"}`}
        description="Your course, your semester, your study material."
        breadcrumbs={<Breadcrumbs items={[{ label: "Dashboard" }]} />}
      />

      <div className="container-page py-12" data-testid="dashboard-page">
        {!user.email_verified && (
          <div
            data-testid="dashboard-verify-banner"
            className="mb-10 flex flex-col gap-4 rounded-2xl border border-brand-warning/40 bg-brand-warning/10 p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brand-warning" aria-hidden="true" />
              <div>
                <p className="font-heading text-sm font-semibold text-fg">Verify your email</p>
                <p className="mt-1 text-sm text-muted">
                  Confirm {user.email} to unlock uploads and saved resources.
                </p>
              </div>
            </div>
            <Link
              to="/verify-email"
              data-testid="dashboard-verify-link"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-warning px-5 font-heading text-sm font-medium text-[#1a1206] transition-opacity duration-200 hover:opacity-90"
            >
              Verify now
            </Link>
          </div>
        )}

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Your profile summary">
          {[
            { icon: GraduationCap, label: "Course", value: data?.course?.name || "—" },
            { icon: BookOpen, label: "Semester", value: user.semester_or_year || "—" },
            { icon: Building2, label: "Role", value: user.role },
            {
              icon: BadgeCheck,
              label: "Email status",
              value: user.email_verified ? "Verified" : "Pending",
            },
          ].map((card, i) => (
            <Reveal key={card.label} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-brand-line bg-brand-surface p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-wider text-muted">{card.label}</p>
                  <card.icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                </div>
                <p className="mt-4 font-heading text-base font-semibold capitalize text-fg">
                  {card.value}
                </p>
              </div>
            </Reveal>
          ))}
        </section>

        <section className="mt-14" aria-labelledby="dash-resources">
          <div className="flex items-center justify-between gap-4">
            <h2 id="dash-resources" className="font-heading text-xl font-semibold text-fg">
              Latest for your university
            </h2>
            <Link
              to="/resources"
              data-testid="dashboard-all-resources"
              className="text-sm text-brand-primary transition-colors duration-200 hover:text-fg"
            >
              Browse all
            </Link>
          </div>
          <div className="mt-6">
            {!data ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonBlock key={i} className="h-48 w-full" />
                ))}
              </div>
            ) : data.resources.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.resources.map((r) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No study materials for your university yet"
                description="New uploads will show up here."
                actionLabel="Browse everything"
                actionTo="/resources"
              />
            )}
          </div>
        </section>

        <section className="mt-14" aria-labelledby="dash-upcoming">
          <h2 id="dash-upcoming" className="font-heading text-xl font-semibold text-fg">
            Coming to your dashboard
          </h2>
          <p className="mt-2 text-sm text-muted">
            These are planned for the next steps and are not active yet.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {UPCOMING.map((item) => (
              <li
                key={item.label}
                data-testid={`dashboard-upcoming-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-2xl border border-dashed border-brand-line bg-brand-surface/50 p-5"
              >
                <p className="flex items-center gap-2 font-heading text-sm font-medium text-muted">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </p>
                <p className="mt-1.5 text-xs text-muted/70">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
