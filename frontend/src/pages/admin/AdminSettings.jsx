import { useEffect, useState } from "react";
import { Settings, Save, Shield, Upload, Users, Bell } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SkeletonBlock } from "@/components/common/Skeletons";
import { ErrorState } from "@/components/common/StateViews";
import { errorMessage } from "@/context/AuthContext";
import { adminApi } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

const defaultSettings = {
  site_name: "CG Student Portal",
  tagline: "Study • Earn • Grow",
  maintenance_mode: false,
  registration_open: true,
  max_upload_size_mb: 100,
  max_uploads_per_hour: 20,
  require_email_verification: true,
  allow_student_uploads: true,
  auto_approve_from_verified: false,
  contact_email: "",
  support_url: "",
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useSeo({ title: "Platform Settings — Admin", path: "/admin/settings" });

  const load = async () => {
    setError(null);
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
    } catch (e) {
      setError(e);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminApi.updateSettings(settings);
      toast.success("Settings saved successfully");
      setDirty(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (error) return (
    <AdminLayout title="Settings" description="Platform configuration">
      <ErrorState onRetry={load} />
    </AdminLayout>
  );

  if (!settings) return (
    <AdminLayout title="Settings" description="Platform configuration">
      <div className="space-y-4">
        <SkeletonBlock className="h-40 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    </AdminLayout>
  );

  const Toggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${
          checked ? "bg-brand-primary" : "bg-brand-line"
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );

  return (
    <AdminLayout
      title="Platform Settings"
      description="Configure global platform behavior and policies."
    >
      {!settings || Object.keys(settings).length === 0 ? null : (
        <>
          {/* General Section */}
          <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-primary/10">
                <Settings className="h-4 w-4 text-brand-primary" />
              </span>
              <div>
                <h3 className="font-heading text-sm font-semibold text-fg">General</h3>
                <p className="text-xs text-muted">Basic platform identity</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted">Site Name</label>
                <input
                  type="text" value={settings.site_name || ""}
                  onChange={(e) => update("site_name", e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted">Tagline</label>
                <input
                  type="text" value={settings.tagline || ""}
                  onChange={(e) => update("tagline", e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted">Contact Email</label>
                  <input
                    type="email" value={settings.contact_email || ""}
                    onChange={(e) => update("contact_email", e.target.value)}
                    placeholder="support@cgstudentportal.in"
                    className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted">Support URL</label>
                  <input
                    type="url" value={settings.support_url || ""}
                    onChange={(e) => update("support_url", e.target.value)}
                    placeholder="https://..."
                    className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Access & Registration */}
          <div className="mt-6 rounded-2xl border border-brand-line bg-brand-surface p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-purple-500/10">
                <Users className="h-4 w-4 text-purple-500" />
              </span>
              <div>
                <h3 className="font-heading text-sm font-semibold text-fg">Access & Registration</h3>
                <p className="text-xs text-muted">Control who can access and join the platform</p>
              </div>
            </div>
            <div className="divide-y divide-brand-line/50">
              <Toggle
                label="Registration Open"
                description="Allow new users to create accounts"
                checked={settings.registration_open}
                onChange={(v) => update("registration_open", v)}
              />
              <Toggle
                label="Require Email Verification"
                description="Users must verify email before full access"
                checked={settings.require_email_verification}
                onChange={(v) => update("require_email_verification", v)}
              />
              <Toggle
                label="Maintenance Mode"
                description="Show maintenance page to all non-staff users"
                checked={settings.maintenance_mode}
                onChange={(v) => update("maintenance_mode", v)}
              />
            </div>
          </div>

          {/* Uploads */}
          <div className="mt-6 rounded-2xl border border-brand-line bg-brand-surface p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/10">
                <Upload className="h-4 w-4 text-blue-500" />
              </span>
              <div>
                <h3 className="font-heading text-sm font-semibold text-fg">Uploads</h3>
                <p className="text-xs text-muted">Configure file upload policies</p>
              </div>
            </div>
            <div className="divide-y divide-brand-line/50">
              <Toggle
                label="Allow Student Uploads"
                description="Students can upload PDFs for approval"
                checked={settings.allow_student_uploads}
                onChange={(v) => update("allow_student_uploads", v)}
              />
              <Toggle
                label="Auto-Approve Verified Users"
                description="Uploads from verified users skip the approval queue"
                checked={settings.auto_approve_from_verified}
                onChange={(v) => update("auto_approve_from_verified", v)}
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted">Max Upload Size (MB)</label>
                <input
                  type="number" min={1} max={500}
                  value={settings.max_upload_size_mb || 100}
                  onChange={(e) => update("max_upload_size_mb", parseInt(e.target.value) || 100)}
                  className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted">Max Uploads per Hour</label>
                <input
                  type="number" min={1} max={100}
                  value={settings.max_uploads_per_hour || 20}
                  onChange={(e) => update("max_uploads_per_hour", parseInt(e.target.value) || 20)}
                  className="mt-1.5 w-full rounded-xl border border-brand-line bg-brand-elevated px-4 py-3 text-sm text-fg outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex items-center justify-end gap-4">
            {dirty && <span className="text-sm text-amber-500">You have unsaved changes</span>}
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-brand-primary px-8 font-heading text-sm font-medium text-white transition-colors hover:bg-brand-primary/90 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
