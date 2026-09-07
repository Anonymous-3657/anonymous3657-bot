import { useEffect, useState } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { notificationApi } from "@/services/api";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const data = await notificationApi.list({ limit: 10 });
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  };

  useEffect(() => {
    load();
    // Poll every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      load();
    } catch (e) {
      console.error("Failed to delete notification", e);
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-brand-line bg-brand-surface text-muted transition-colors hover:text-fg"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-error text-xs font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-brand-line bg-brand-surface shadow-2xl sm:w-96"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-brand-line px-4 py-3">
                <h3 className="font-heading text-sm font-semibold text-fg">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs text-brand-primary hover:text-fg"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted">
                    <Bell className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-brand-line">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`relative px-4 py-3 transition-colors ${
                          n.read ? "" : "bg-brand-primary/5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-lg">{getIcon(n.type)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-fg">{n.title}</p>
                            <p className="mt-0.5 text-xs text-muted line-clamp-2">
                              {n.message}
                            </p>
                            <p className="mt-1 text-xs text-muted/60">
                              {new Date(n.created_at).toLocaleDateString()}
                            </p>
                            {n.link && (
                              <Link
                                to={n.link}
                                onClick={() => setIsOpen(false)}
                                className="mt-1 inline-block text-xs text-brand-primary hover:text-fg"
                              >
                                View →
                              </Link>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            {!n.read && (
                              <button
                                type="button"
                                onClick={() => markAsRead(n.id)}
                                className="text-muted hover:text-brand-success"
                                aria-label="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteNotification(n.id)}
                              className="text-muted hover:text-brand-error"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-brand-line px-4 py-2">
                <Link
                  to="/notifications"
                  onClick={() => setIsOpen(false)}
                  className="block text-center text-xs text-brand-primary hover:text-fg"
                >
                  View all notifications
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
