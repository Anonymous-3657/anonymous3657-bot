import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/StateViews";
import { ADMIN_ENTITIES } from "@/constants/adminEntities";
import { adminApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useSeo } from "@/hooks/useSeo";

export default function AdminOverview() {
  const { user } = useAuth();
  const [counts, setCounts] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(30);

  useSeo({ title: "Admin Dashboard — CG STUDENT PORTAL", path: "/admin" });

  const load = async () => {
    setError(null);
    try {
      const [overviewData, analyticsData, activityData] = await Promise.all([
        adminApi.overview(),
        adminApi.analytics({ days: period }),
        adminApi.activity(),
      ]);
      setCounts(overviewData.counts);
      setAnalytics(analyticsData);
      setActivity(activityData);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  const StatCard = ({ icon, label, value, color, testId }) => {
    const Icon = Icons[icon] || Icons.Database;
    return (
      <div data-testid={testId} className="rounded-2xl border border-brand-line bg-brand-surface p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" aria-hidden="true" />
          </span>
        </div>
        <p className="mt-3 font-heading text-2xl font-bold tracking-tight text-fg">{value}</p>
      </div>
    );
  };

  const BarChart = ({ data, maxItems = 8 }) => {
    if (!data || data.length === 0) return <p className="text-sm text-muted">No data yet</p>;
    const sliced = data.slice(0, maxItems);
    const maxVal = Math.max(...sliced.map(d => d.count), 1);
    return (
      <div className="space-y-2">
        {sliced.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 truncate text-xs text-muted" title={item.subject || item.college || item.date}>
              {item.subject || item.college || item.date}
            </span>
            <div className="flex-1 h-6 rounded bg-brand-elevated overflow-hidden">
              <div
                className="h-full rounded bg-brand-primary/60 transition-all duration-500"
                style={{ width: `${(item.count / maxVal) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs font-medium text-fg">{item.count}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout
      title={`Welcome back, ${user?.name || "admin"}`}
      description="Platform analytics and management dashboard."
    >
      {error ? (
        <ErrorState onRetry={load} />
      ) : !counts ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Period Selector */}
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-fg">Analytics Overview</h2>
            <div className="flex gap-2">
              {[7, 30, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setPeriod(d)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    period === d
                      ? "bg-brand-primary text-white"
                      : "border border-brand-line text-muted hover:text-fg"
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-dashboard-stats">
            <StatCard icon="FileText" label="Total PDFs" value={analytics?.pdfs?.total || 0} color="bg-blue-500" testId="stat-pdfs" />
            <StatCard icon="Download" label="Total Downloads" value={analytics?.pdfs?.total_downloads || 0} color="bg-green-500" testId="stat-downloads" />
            <StatCard icon="Users" label="Total Users" value={analytics?.users?.total || 0} color="bg-purple-500" testId="stat-users" />
            <StatCard icon="Clock" label="Pending Review" value={analytics?.pdfs?.pending || 0} color="bg-amber-500" testId="stat-pending" />
          </div>

          {/* Secondary Stats */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon="CheckCircle" label="Approved" value={analytics?.pdfs?.approved || 0} color="bg-emerald-500" />
            <StatCard icon="XCircle" label="Rejected" value={analytics?.pdfs?.rejected || 0} color="bg-red-500" />
            <StatCard icon="Upload" label="Recent Uploads" value={analytics?.pdfs?.recent_uploads || 0} color="bg-indigo-500" />
            <StatCard icon="UserCheck" label="Active Users" value={analytics?.users?.active || 0} color="bg-teal-500" />
          </div>

          {/* Charts Row */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Top Subjects */}
            <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
              <h3 className="font-heading text-sm font-semibold text-fg">Top Subjects</h3>
              <p className="text-xs text-muted mt-1">Most uploaded subject areas</p>
              <div className="mt-4">
                <BarChart data={analytics?.charts?.top_subjects} />
              </div>
            </div>

            {/* Top Colleges */}
            <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
              <h3 className="font-heading text-sm font-semibold text-fg">Top Colleges</h3>
              <p className="text-xs text-muted mt-1">Most active colleges by uploads</p>
              <div className="mt-4">
                <BarChart data={analytics?.charts?.top_colleges} />
              </div>
            </div>
          </div>

          {/* Most Downloaded + Recent Activity */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Most Downloaded PDFs */}
            <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
              <h3 className="font-heading text-sm font-semibold text-fg">📥 Most Downloaded</h3>
              <p className="text-xs text-muted mt-1">Top PDFs by download count</p>
              <div className="mt-4 space-y-3">
                {analytics?.charts?.top_downloaded?.length > 0 ? (
                  analytics.charts.top_downloaded.slice(0, 5).map((pdf, i) => (
                    <div key={pdf.id} className="flex items-center gap-3">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-primary/10 text-xs font-bold text-brand-primary">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-sm text-fg">{pdf.title}</span>
                      <span className="text-xs font-medium text-muted">{pdf.downloads} ↓</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No downloads yet</p>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
              <h3 className="font-heading text-sm font-semibold text-fg">📋 Recent Activity</h3>
              <p className="text-xs text-muted mt-1">Latest platform events</p>
              <div className="mt-4 space-y-3 max-h-60 overflow-y-auto">
                {activity?.recent_events?.length > 0 ? (
                  activity.recent_events.slice(0, 8).map((event) => (
                    <div key={event.id} className="flex items-start gap-3 text-sm">
                      <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                        event.event?.includes("upload") ? "bg-blue-400" :
                        event.event?.includes("approve") ? "bg-green-400" :
                        event.event?.includes("reject") ? "bg-red-400" :
                        event.event?.includes("login") ? "bg-purple-400" :
                        "bg-gray-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-fg truncate">
                          <span className="font-medium">{event.event?.replace(/_/g, " ")}</span>
                          {event.email && <span className="text-muted"> — {event.email}</span>}
                        </p>
                        <p className="text-xs text-muted">{event.created_at?.slice(0, 16).replace("T", " ")}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No recent activity</p>
                )}
              </div>
            </div>
          </div>

          {/* Role Distribution */}
          {analytics?.charts?.role_distribution?.length > 0 && (
            <div className="mt-6 rounded-2xl border border-brand-line bg-brand-surface p-6">
              <h3 className="font-heading text-sm font-semibold text-fg">👥 User Roles Distribution</h3>
              <div className="mt-4 flex flex-wrap gap-4">
                {analytics.charts.role_distribution.map((role) => (
                  <div key={role.role} className="flex items-center gap-2 rounded-lg border border-brand-line px-3 py-2">
                    <span className="text-sm font-medium text-fg capitalize">{role.role?.replace(/_/g, " ")}</span>
                    <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-bold text-brand-primary">
                      {role.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions + Entity Shortcuts */}
          <div className="mt-8">
            <h2 className="font-heading text-lg font-semibold text-fg">Quick Actions</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/admin/pdfs"
                className="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-surface p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand-primary/50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15">
                  <Icons.FileCheck2 className="h-5 w-5 text-amber-500" />
                </span>
                <span>
                  <span className="block font-heading text-sm font-medium text-fg">Review PDFs</span>
                  <span className="text-xs text-muted">{counts.pdfs_pending || 0} pending</span>
                </span>
              </Link>
              <Link
                to="/admin/announcements"
                className="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-surface p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand-primary/50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/15">
                  <Icons.Megaphone className="h-5 w-5 text-blue-500" />
                </span>
                <span>
                  <span className="block font-heading text-sm font-medium text-fg">Announcements</span>
                  <span className="text-xs text-muted">Create & manage</span>
                </span>
              </Link>
              <Link
                to="/admin/settings"
                className="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-surface p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand-primary/50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gray-500/15">
                  <Icons.Settings className="h-5 w-5 text-gray-400" />
                </span>
                <span>
                  <span className="block font-heading text-sm font-medium text-fg">Settings</span>
                  <span className="text-xs text-muted">Platform config</span>
                </span>
              </Link>
              <a
                href={adminApi.exportPdfs()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-brand-line bg-brand-surface p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand-primary/50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-500/15">
                  <Icons.Download className="h-5 w-5 text-green-500" />
                </span>
                <span>
                  <span className="block font-heading text-sm font-medium text-fg">Export Data</span>
                  <span className="text-xs text-muted">Download as CSV</span>
                </span>
              </a>
            </div>
          </div>

          {/* Entity Management Shortcuts */}
          <div className="mt-8">
            <h2 className="font-heading text-lg font-semibold text-fg">Manage Content</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(ADMIN_ENTITIES).map(([key, cfg]) => {
                const Icon = Icons[cfg.icon] || Icons.Database;
                return (
                  <Link
                    key={key}
                    to={`/admin/${key}`}
                    data-testid={`admin-shortcut-${key}`}
                    className="group flex items-center gap-4 rounded-2xl border border-brand-line bg-brand-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-brand-primary/50"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-primary/12">
                      <Icon className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-heading text-sm font-medium text-fg">
                        Manage {cfg.label}
                      </span>
                      <span className="text-xs text-muted">
                        {counts[key] != null ? `${counts[key]} records` : "Create, edit and archive"}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
