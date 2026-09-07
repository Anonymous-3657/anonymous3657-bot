import { useEffect, useState } from "react";
import { X, Megaphone, Info, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { publicApi } from "@/services/api";

const ICONS = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  urgent: AlertCircle,
};

const STYLES = {
  info: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300",
  success: "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  urgent: "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300",
};

export default function PublicAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    publicApi.announcements({ limit: 5 })
      .then((data) => setAnnouncements(data.items || []))
      .catch(() => {});
  }, []);

  const dismiss = (id) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="public-announcements">
      {visible.map((ann) => {
        const Icon = ICONS[ann.type] || Info;
        const style = STYLES[ann.type] || STYLES.info;
        return (
          <div
            key={ann.id}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${style}`}
            data-testid={`announcement-${ann.id}`}
          >
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{ann.title}</p>
              <p className="mt-0.5 text-xs opacity-80 line-clamp-2">{ann.message}</p>
              {ann.link_url && (
                <a href={ann.link_url} className="mt-1 inline-block text-xs underline opacity-90 hover:opacity-100">
                  Learn more →
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(ann.id)}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
