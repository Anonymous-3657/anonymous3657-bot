import { useEffect, useState } from "react";
import { Bell, Check, Trash2, CheckCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { notificationApi } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";
import { toast } from "sonner";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread

  useSeo({ title: "Notifications — CG STUDENT PORTAL", path: "/notifications" });

  useEffect(() => {
    load();
  }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await notificationApi.list({
        limit: 50,
        unread_only: filter === "unread",
      });
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (e) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      toast.error("Failed to mark as read");
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted");
    } catch (e) {
      toast.error("Failed to delete notification");
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "pdf_approved": return "🎉";
      case "pdf_rejected": return "❌";
      case "new_announcement": return "📢";
      case "welcome": return "👋";
      default: return "🔔";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "pdf_approved": return "PDF Approved";
      case "pdf_rejected": return "PDF Rejected";
      case "new_announcement": return "Announcement";
      case "welcome": return "Welcome";
      default: return "Notification";
    }
  };

  return (
    <AppShell>
      <div className="container-page py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-fg">Notifications</h1>
            <p className="mt-2 text-muted">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "You're all caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-brand-primary text-white"
                : "bg-brand-surface text-muted hover:text-fg"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === "unread"
                ? "bg-brand-primary text-white"
                : "bg-brand-surface text-muted hover:text-fg"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-brand-error px-2 py-0.5 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-brand-line" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-brand-line bg-brand-surface p-12 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted" />
            <h2 className="font-heading text-xl font-semibold text-fg">No notifications</h2>
            <p className="mt-2 text-muted">
              {filter === "unread" ? "No unread notifications" : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notifications.map((n, i) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border border-brand-line bg-brand-surface p-4 transition-colors ${
                  n.read ? "" : "bg-brand-primary/5"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="mt-1 text-2xl">{getIcon(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-fg">{n.title}</p>
                        <p className="mt-1 text-sm text-muted">{n.message}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted/60">
                          <span>{getTypeLabel(n.type)}</span>
                          <span>•</span>
                          <span>{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => markAsRead(n.id)}
                            className="text-muted hover:text-brand-success"
                            aria-label="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteNotification(n.id)}
                          className="text-muted hover:text-brand-error"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {n.link && (
                      <Link
                        to={n.link}
                        className="mt-3 inline-block rounded-lg bg-brand-elevated px-3 py-1.5 text-xs font-medium text-brand-primary hover:text-fg"
                      >
                        View details →
                      </Link>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
