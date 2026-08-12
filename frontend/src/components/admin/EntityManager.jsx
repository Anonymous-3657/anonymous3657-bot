import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { ADMIN_ENTITIES } from "@/constants/adminEntities";
import { formatApiError } from "@/context/AuthContext";
import { adminApi } from "@/services/api";

const REF_CACHE_ENTITIES = ["states", "universities", "courses", "subjects", "categories"];

const emptyForm = (fields) =>
  fields.reduce((acc, f) => ({ ...acc, [f.name]: f.type === "boolean" ? false : "" }), {});

export const EntityManager = ({ entity }) => {
  const config = ADMIN_ENTITIES[entity];
  const [items, setItems] = useState([]);
  const [refs, setRefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} for create | record
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const refEntities = useMemo(
    () => [...new Set(config.fields.filter((f) => f.type === "ref").map((f) => f.ref))],
    [config.fields],
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.list(entity, { limit: 200 });
      setItems(data.items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  useEffect(() => {
    const wanted = refEntities.filter((r) => REF_CACHE_ENTITIES.includes(r));
    Promise.all(
      wanted.map(async (name) => {
        const data = await adminApi.list(name, { limit: 200 }).catch(() => ({ items: [] }));
        return [name, data.items];
      }),
    ).then((pairs) => setRefs(Object.fromEntries(pairs)));
  }, [refEntities]);

  const openCreate = () => {
    setForm(emptyForm(config.fields));
    setEditing({});
  };

  const openEdit = (record) => {
    const next = {};
    config.fields.forEach((f) => {
      const value = record[f.name];
      next[f.name] = f.type === "boolean" ? Boolean(value) : value ?? "";
    });
    setForm(next);
    setEditing(record);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing?.id) {
        await adminApi.update(entity, editing.id, form);
        toast.success(`${config.label} updated`);
      } else {
        await adminApi.create(entity, form);
        toast.success(`${config.label} created`);
      }
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record) => {
    if (!window.confirm(`Archive "${record[config.titleField]}"?`)) return;
    try {
      await adminApi.remove(entity, record.id);
      toast.success("Record archived");
      await load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  const refLabel = (refName, id) => {
    const found = (refs[refName] || []).find((r) => r.id === id);
    return found ? found.name || found.title : "—";
  };

  const renderCell = (record, column) => {
    const value = record[column];
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value ?? "—";
  };

  return (
    <AdminLayout
      title={config.label}
      description={config.note || `Create, edit and archive ${config.label.toLowerCase()}.`}
      actions={
        <button
          type="button"
          onClick={openCreate}
          data-testid={`admin-${entity}-create-button`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand-primary px-5 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New {config.label.replace(/ies$/, "y").replace(/s$/, "")}
        </button>
      }
    >
      {loading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
          <SkeletonBlock className="h-12 w-full" />
        </div>
      ) : error ? (
        <ErrorState onRetry={load} description={formatApiError(error.response?.data?.detail)} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`No ${config.label.toLowerCase()} yet`}
          description="Create the first record to get started."
          actionLabel="Create record"
          onAction={openCreate}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-line bg-brand-surface">
          <table className="w-full min-w-[640px] text-left" data-testid={`admin-${entity}-table`}>
            <thead>
              <tr className="border-b border-brand-line">
                {config.columns.map((c) => (
                  <th key={c} className="px-5 py-4 font-heading text-xs uppercase tracking-wider text-muted">
                    {c.replace(/_/g, " ")}
                  </th>
                ))}
                <th className="px-5 py-4 text-right font-heading text-xs uppercase tracking-wider text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((record) => (
                <tr
                  key={record.id}
                  data-testid={`admin-${entity}-row-${record.id}`}
                  className="border-b border-brand-line/60 last:border-0 transition-colors duration-200 hover:bg-brand-elevated"
                >
                  {config.columns.map((c) => (
                    <td key={c} className="px-5 py-4 text-sm text-fg/85">
                      {renderCell(record, c)}
                    </td>
                  ))}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(record)}
                        aria-label={`Edit ${record[config.titleField]}`}
                        data-testid={`admin-${entity}-edit-${record.id}`}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:text-fg"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(record)}
                        aria-label={`Archive ${record[config.titleField]}`}
                        data-testid={`admin-${entity}-delete-${record.id}`}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:border-brand-error/50 hover:text-brand-error"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${editing.id ? "Edit" : "Create"} ${config.label}`}
        >
          <form
            onSubmit={save}
            data-testid={`admin-${entity}-form`}
            className="w-full max-w-2xl rounded-2xl border border-brand-line bg-brand-surface p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-heading text-lg font-semibold text-fg">
                {editing.id ? "Edit" : "New"} {config.label.replace(/ies$/, "y").replace(/s$/, "")}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                data-testid={`admin-${entity}-form-close`}
                className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {config.fields.map((field) => {
                const id = `field-${entity}-${field.name}`;
                const common =
                  "mt-2 min-h-[44px] w-full rounded-xl border border-brand-line bg-brand-elevated px-4 text-sm text-fg outline-none transition-colors duration-200 focus:border-brand-primary";
                return (
                  <div
                    key={field.name}
                    className={field.type === "textarea" ? "sm:col-span-2" : undefined}
                  >
                    <label htmlFor={id} className="font-heading text-sm font-medium text-fg">
                      {field.label}
                      {field.required && <span className="text-brand-error"> *</span>}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        id={id}
                        data-testid={id}
                        rows={3}
                        value={form[field.name] ?? ""}
                        onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                        className={`${common} py-3`}
                      />
                    ) : field.type === "select" ? (
                      <select
                        id={id}
                        data-testid={id}
                        value={form[field.name] ?? ""}
                        onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                        className={common}
                      >
                        <option value="">Not set</option>
                        {field.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "ref" ? (
                      <select
                        id={id}
                        data-testid={id}
                        value={form[field.name] ?? ""}
                        onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                        className={common}
                      >
                        <option value="">Not set</option>
                        {(refs[field.ref] || []).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name || o.title}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "boolean" ? (
                      <label className="mt-2 flex min-h-[44px] items-center gap-3 rounded-xl border border-brand-line bg-brand-elevated px-4">
                        <input
                          id={id}
                          data-testid={id}
                          type="checkbox"
                          checked={Boolean(form[field.name])}
                          onChange={(e) => setForm({ ...form, [field.name]: e.target.checked })}
                          className="h-4 w-4 accent-[color:var(--brand-primary)]"
                        />
                        <span className="text-sm text-muted">Enabled</span>
                      </label>
                    ) : (
                      <input
                        id={id}
                        data-testid={id}
                        type={field.type === "number" ? "number" : "text"}
                        value={form[field.name] ?? ""}
                        onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                        className={common}
                      />
                    )}

                    {field.hint && <p className="mt-1.5 text-xs text-muted/70">{field.hint}</p>}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="min-h-[44px] rounded-xl border border-brand-line px-5 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                data-testid={`admin-${entity}-form-submit`}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {editing.id ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
};
