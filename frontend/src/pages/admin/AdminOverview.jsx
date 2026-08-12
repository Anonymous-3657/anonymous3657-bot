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
  const [error, setError] = useState(null);

  useSeo({ title: "Admin overview — CG STUDENT PORTAL", path: "/admin" });

  const load = async () => {
    setError(null);
    try {
      const data = await adminApi.overview();
      setCounts(data.counts);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout
      title={`Welcome back, ${user?.name || "admin"}`}
      description="Manage the catalog that powers the public portal."
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-overview-counts">
            {Object.entries(counts).map(([key, value]) => {
              const cfg = ADMIN_ENTITIES[key];
              const Icon = Icons[cfg?.icon] || Icons.Database;
              return (
                <div
                  key={key}
                  data-testid={`admin-count-${key}`}
                  className="rounded-2xl border border-brand-line bg-brand-surface p-6"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-muted">
                      {key.replace(/_/g, " ")}
                    </p>
                    <Icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                  </div>
                  <p className="mt-4 font-heading text-3xl font-bold tracking-tight text-fg">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                    <span className="text-xs text-muted">Create, edit and archive records</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
