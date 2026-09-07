import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Award,
  Download,
  Upload,
  CheckCircle,
  Clock,
  Edit3,
  Save,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { profileApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useSeo } from "@/hooks/useSeo";
import { toast } from "sonner";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    phone: "",
  });

  useSeo({ title: "My Profile — CG STUDENT PORTAL", path: "/profile" });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await profileApi.get();
      setProfile(data);
      setFormData({
        name: data.user.name || "",
        bio: data.user.bio || "",
        phone: data.user.phone || "",
      });
    } catch (e) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await profileApi.update(formData);
      toast.success("Profile updated!");
      setEditing(false);
      loadProfile();
      refreshUser();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.user?.name || "",
      bio: profile?.user?.bio || "",
      phone: profile?.user?.phone || "",
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="container-page py-20">
          <div className="h-8 w-48 animate-pulse rounded bg-brand-line" />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-brand-line" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="container-page py-20 text-center">
          <p className="text-muted">Failed to load profile</p>
        </div>
      </AppShell>
    );
  }

  const stats = [
    {
      icon: Upload,
      label: "Total Uploads",
      value: profile.stats.total_uploads,
      color: "text-blue-500",
    },
    {
      icon: CheckCircle,
      label: "Approved",
      value: profile.stats.approved_uploads,
      color: "text-green-500",
    },
    {
      icon: Clock,
      label: "Pending",
      value: profile.stats.pending_uploads,
      color: "text-yellow-500",
    },
    {
      icon: Download,
      label: "Total Downloads",
      value: profile.stats.total_downloads,
      color: "text-purple-500",
    },
  ];

  return (
    <AppShell>
      <div className="container-page py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-fg">My Profile</h1>
          <p className="mt-2 text-muted">Manage your account and view statistics</p>
        </div>

        {/* Profile Card */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* User Info */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
              <div className="flex items-start justify-between">
                <h2 className="font-heading text-lg font-semibold text-fg">User Info</h2>
                <button
                  type="button"
                  onClick={() => setEditing(!editing)}
                  className="text-muted hover:text-fg"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>

              {/* Avatar */}
              <div className="mt-6 flex flex-col items-center text-center">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-primary to-brand-accent text-3xl font-bold text-white">
                  {profile.user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <h3 className="mt-4 font-heading text-xl font-semibold text-fg">
                  {profile.user.name}
                </h3>
                <p className="text-sm text-muted">@{profile.user.username}</p>
              </div>

              {/* Details */}
              <div className="mt-6 space-y-4">
                {editing ? (
                  <>
                    <div>
                      <label className="text-xs text-muted">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-brand-line bg-brand-elevated px-3 py-2 text-sm text-fg outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted">Bio</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        rows={3}
                        maxLength={500}
                        className="mt-1 w-full rounded-lg border border-brand-line bg-brand-elevated px-3 py-2 text-sm text-fg outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-brand-line bg-brand-elevated px-3 py-2 text-sm text-fg outline-none focus:border-brand-primary"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
                      >
                        <Save className="mr-2 inline h-4 w-4" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="rounded-lg border border-brand-line px-4 py-2 text-sm text-muted hover:text-fg"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted" />
                      <span className="text-sm text-fg">{profile.user.email}</span>
                    </div>
                    {profile.user.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted" />
                        <span className="text-sm text-fg">{profile.user.phone}</span>
                      </div>
                    )}
                    {profile.user.bio && (
                      <p className="text-sm text-muted">{profile.user.bio}</p>
                    )}
                    {profile.user.college_name && (
                      <div className="mt-4 rounded-lg bg-brand-elevated p-3">
                        <p className="text-xs text-muted">College</p>
                        <p className="text-sm font-medium text-fg">{profile.user.college_name}</p>
                        {profile.user.district && (
                          <p className="text-xs text-muted">{profile.user.district}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Account Info */}
              <div className="mt-6 border-t border-brand-line pt-4">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Calendar className="h-3 w-3" />
                  <span>Joined {new Date(profile.user.created_at).toLocaleDateString()}</span>
                </div>
                {profile.user.email_verified && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-500">
                    <CheckCircle className="h-3 w-3" />
                    <span>Email verified</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats & Recent Uploads */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-brand-line bg-brand-surface p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl bg-brand-elevated ${stat.color}`}>
                      <stat.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-fg">{stat.value}</p>
                      <p className="text-xs text-muted">{stat.label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Uploads */}
            <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
              <h2 className="font-heading text-lg font-semibold text-fg">Recent Uploads</h2>
              {profile.recent_uploads.length === 0 ? (
                <p className="mt-4 text-center text-sm text-muted">No uploads yet</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {profile.recent_uploads.map((upload) => (
                    <li
                      key={upload.id}
                      className="flex items-center justify-between rounded-lg border border-brand-line bg-brand-elevated p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{upload.title}</p>
                        <p className="text-xs text-muted">
                          {new Date(upload.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Download className="h-3 w-3" />
                          {upload.downloads}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            upload.status === "approved"
                              ? "bg-green-500/10 text-green-500"
                              : upload.status === "rejected"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {upload.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
