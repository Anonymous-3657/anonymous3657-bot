import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Bookmark,
  BookOpen,
  Building2,
  CalendarClock,
  FileText,
  GraduationCap,
  Sparkles,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Reveal } from "@/components/common/Reveal";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/StateViews";
import { ResourceCard } from "@/components/cards/ResourceCard";
import { PdfBookmarkButton } from "@/components/resources/BookmarkButton";
import { useAuth } from "@/context/AuthContext";
import { api, pdfApi, studentApi } from "@/services/api";
import { fmtDate } from "@/utils/format";
import { useSeo } from "@/hooks/useSeo";

const TOOLS = [
  {
    to: "/study-buddy",
    testId: "dashboard-study-buddy-link",
    icon: Sparkles,
    tint: "bg-brand-accent/12 text-brand-accent",
    title: "AI Study Buddy",
    detail: "Summarise a PDF, ask doubts, generate practice questions.",
  },
  {
    to: "/bookmarks",
    testId: "dashboard-bookmarks-link",
    icon: Bookmark,
    tint: "bg-brand-primary/12 text-brand-primary",
    title: "My shelf",
    detail: "Every paper, note and PDF you saved.",
  },
  {
    to: "/dashboard/uploads/new",
    testId: "dashboard-upload-link",
    icon: Upload,
    tint: "bg-brand-success/12 text-brand-success",
    title: "Upload study material",
    detail: "Share a PDF — admins review it before it goes live.",
  },
  {
    to: "/dashboard/uploads",
    testId: "dashboard-my-uploads-link",
    icon: FileText,
    tint: "bg-brand-info/12 text-brand-info",
    title: "My uploads",
    detail: "Check the review status of your documents.",
  },
];

const ExamCountdown = ({ exam }) => {
  if (!exam) return <SkeletonBlock className="h-40 w-full rounded-2xl" />;

  const tone =
    exam.state === "upcoming"
      ? "border-brand-primary/50 bg-brand-primary/10"
      : exam.state === "ongoing"
        ? "border-brand-warning/50 bg-brand-warning/10"
        : "border-brand-line bg-brand-surface";

  return (
    <div
      data-testid="dashboard-exam-countdown"
      className={`flex h-full flex-col justify-between rounded-2xl border p-7 ${tone}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-heading text-xs uppercase tracking-wider text-muted">Exam countdown</p>
        <CalendarClock className="h-4 w-4 text-brand-primary" aria-hidden="true" />
      </div>

      <div className="mt-5">
        <p className="text-sm text-muted">
          {[exam.course, exam.semester].filter(Boolean).join(" — ") || "Your course"}
          {exam.exam_type ? ` · ${exam.exam_type}` : ""}
        </p>
        {exam.state === "upcoming" ? (
          <p
            data-testid="dashboard-exam-days"
            className="mt-3 font-heading text-4xl font-semibold tracking-tight text-fg"
          >
            {exam.days_left} <span className="text-lg font-normal text-muted">days left</span>
          </p>
        ) : (
          <p
            data-testid="dashboard-exam-message"
            className="mt-3 font-heading text-xl font-semibold text-fg"
          >
            {exam.message}
          </p>
        )}
        {exam.start_date && (
          <p className="mt-3 text-sm text-muted">
            Exam date: {fmtDate(exam.start_date)}
            {exam.end_date && exam.end_date !== exam.start_date
              ? ` – ${fmtDate(exam.end_date)}`
              : ""}
          </p>
        )}
        {exam.session && <p className="mt-1 text-xs text-muted/70">Session {exam.session}</p>}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [exam, setExam] = useState(null);
  const [pdfs, setPdfs] = useState([]);

  useSeo({ title: "My dashboard — CG STUDENT PORTAL", path: "/dashboard" });

  useEffect(() => {
    const load = async () => {
      const [courses, resources] = await Promise.all([
        api.courses({ limit: 100 }),
        api.resources({
          limit: 6,
          sort: "recent",
          university_id: user.university_id || undefined,
        }),
      ]);
      setData({
        course: courses.items.find((c) => c.id === user.course_id) || null,
        resources: resources.items,
      });
    };
    load();
    studentApi
      .examCountdown()
      .then(setExam)
      .catch(() => setExam({ state: "unscheduled", message: "Exam date will be announced soon." }));
    pdfApi
      .approved({ limit: 6 })
      .then((d) => setPdfs(d.items))
      .catch(() => setPdfs([]));
  }, [user.course_id, user.university_id]);

  return (
    <AppShell>
      <PageHeader
        title={`Hi ${user.name?.split(" ")[0] || "student"}`}
        description={user.college_name || "Your course, your semester, your study material."}
        breadcrumbs={<Breadcrumbs items={[{ label: "Dashboard" }]} />}
      />

      <div className="container-page py-12" data-testid="dashboard-page">
        {!user.college_name && (
          <div
            data-testid="dashboard-college-banner"
            className="mb-8 flex flex-col gap-4 rounded-2xl border border-brand-info/40 bg-brand-info/10 p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-info" aria-hidden="true" />
              <div>
                <p className="font-heading text-sm font-semibold text-fg">
                  Please select your college to complete your profile.
                </p>
                <p className="mt-1 text-sm text-muted">
                  It takes a few seconds and unlocks college-specific material.
                </p>
              </div>
            </div>
            <Link
              to="/profile"
              data-testid="dashboard-college-link"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-info px-5 font-heading text-sm font-medium text-[#05121a] transition-opacity duration-200 hover:opacity-90"
            >
              Select college
            </Link>
          </div>
        )}

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

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]" aria-label="Your profile summary">
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { icon: Building2, label: "College", value: user.college_name || "Not set" },
              { icon: GraduationCap, label: "Course", value: data?.course?.name || "—" },
              { icon: BookOpen, label: "Semester", value: user.semester_or_year || "—" },
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
                  <p className="mt-4 font-heading text-base font-semibold text-fg">{card.value}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <ExamCountdown exam={exam} />
        </section>

        <section className="mt-14 grid gap-5 sm:grid-cols-2" aria-label="Quick actions">
          {TOOLS.map((tool) => (
            <Link
              key={tool.to}
              to={tool.to}
              data-testid={tool.testId}
              className="group flex items-start gap-4 rounded-2xl border border-brand-line bg-brand-surface p-6 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-brand-primary/50"
            >
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tool.tint}`}>
                <tool.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-heading text-base font-semibold text-fg">
                  {tool.title}
                </span>
                <span className="mt-1 block text-sm text-muted">{tool.detail}</span>
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-14" aria-labelledby="dash-pdfs">
          <div className="flex items-center justify-between gap-4">
            <h2 id="dash-pdfs" className="font-heading text-xl font-semibold text-fg">
              Recently approved PDFs
            </h2>
            <Link
              to="/study-buddy"
              data-testid="dashboard-pdf-summarise-link"
              className="text-sm text-brand-primary transition-colors duration-200 hover:text-fg"
            >
              Summarise with AI
            </Link>
          </div>
          <div className="mt-6">
            {pdfs.length === 0 ? (
              <EmptyState
                title="No approved PDFs yet"
                description="Approved student uploads will appear here."
                actionLabel="Upload the first one"
                actionTo="/dashboard/uploads/new"
              />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="dashboard-pdf-list">
                {pdfs.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-2xl border border-brand-line bg-brand-surface p-5"
                  >
                    <p className="font-heading text-sm font-semibold text-fg">{p.title}</p>
                    <p className="mt-1.5 text-xs text-muted">
                      {p.subject} · {p.semester}
                    </p>
                    <a
                      href={pdfApi.fileUrl(p.id)}
                      target="_blank"
                      rel="noreferrer"
                      data-testid={`dashboard-pdf-open-${p.id}`}
                      className="mt-4 inline-flex text-sm text-brand-primary hover:text-fg"
                    >
                      Open PDF
                    </a>
                    <div className="mt-3">
                      <PdfBookmarkButton pdfId={p.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
      </div>
    </AppShell>
  );
}
