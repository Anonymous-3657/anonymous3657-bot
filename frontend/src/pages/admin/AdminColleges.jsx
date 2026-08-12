import { useEffect, useState } from "react";
import { Power, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { errorMessage } from "@/context/AuthContext";
import { adminApi, api } from "@/services/api";

const TYPES = [
  { value: "", label: "All types" },
  { value: "G", label: "Government" },
  { value: "NG", label: "Non-Government" },
  { value: "G-A", label: "Government Autonomous" },
];

const selectClass =
  "min-h-[44px] rounded-xl border border-brand-line bg-brand-elevated px-4 text-sm text-fg outline-none focus:border-brand-primary";

export default function AdminColleges() {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [collegeType, setCollegeType] = useState("");
  const [districts, setDistricts] = useState([]);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .collegeMaster({ limit: 1 })
      .then((d) => setDistricts(d.districts))
      .catch(() => setDistricts([]));
  }, []);

  const load = async () => {
    setItems(null);
    setError(null);
    try {
      const data = await adminApi.list("colleges", {
        limit: 200,
        q: q.trim() || undefined,
        district: district || undefined,
        college_type: collegeType || undefined,
      });
      setItems(data.items.filter((c) => c.college_code));
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, district, collegeType]);

  const toggleActive = async (college) => {
    try {
      await adminApi.update("colleges", college.id, { is_active: !college.is_active });
      toast.success(college.is_active ? "College deactivated" : "College activated");
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <AdminLayout
      title="College management"
      description="The official affiliated-college master list. Deactivate instead of deleting — student records reference these colleges."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center" data-testid="admin-colleges-filters">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            data-testid="admin-colleges-search"
            placeholder="Search by college name or code…"
            className="min-h-[44px] w-full rounded-xl border border-brand-line bg-brand-elevated pl-11 pr-4 text-sm text-fg outline-none focus:border-brand-primary"
          />
        </div>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          data-testid="admin-colleges-district"
          aria-label="Filter by district"
          className={selectClass}
        >
          <option value="">All districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={collegeType}
          onChange={(e) => setCollegeType(e.target.value)}
          data-testid="admin-colleges-type"
          aria-label="Filter by type"
          className={selectClass}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-sm text-muted" data-testid="admin-colleges-count">
        Showing {items?.length ?? 0} affiliated colleges
      </p>

      <div className="mt-4">
        {error ? (
          <ErrorState onRetry={load} />
        ) : !items ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-14 w-full" />
            <SkeletonBlock className="h-14 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No colleges match" description="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-line bg-brand-surface">
            <table className="w-full min-w-[720px] text-left" data-testid="admin-colleges-table">
              <thead>
                <tr className="border-b border-brand-line">
                  {["Code", "College", "District", "Type", "Active", ""].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 font-heading text-xs uppercase tracking-wider text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    data-testid={`admin-college-row-${c.college_code}`}
                    className="border-b border-brand-line/60 last:border-0 hover:bg-brand-elevated"
                  >
                    <td className="px-5 py-4 font-mono text-sm text-muted">{c.college_code}</td>
                    <td className="px-5 py-4 text-sm text-fg/85">{c.college_name || c.name}</td>
                    <td className="px-5 py-4 text-sm text-muted">{c.district}</td>
                    <td className="px-5 py-4 text-sm text-muted">{c.college_type}</td>
                    <td className="px-5 py-4 text-sm">
                      <span
                        className={
                          c.is_active ? "text-brand-success" : "text-brand-error"
                        }
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleActive(c)}
                        data-testid={`admin-college-toggle-${c.college_code}`}
                        className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-brand-line px-4 font-heading text-sm text-muted transition-colors duration-200 hover:text-fg"
                      >
                        <Power className="h-4 w-4" aria-hidden="true" />
                        {c.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
