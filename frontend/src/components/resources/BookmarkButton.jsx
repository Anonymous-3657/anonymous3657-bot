import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { studentApi } from "@/services/api";

let cache = null;
const listeners = new Set();

const publish = () => listeners.forEach((fn) => fn(cache));

/** Shared bookmark id set so every card stays in sync without prop drilling. */
export const useBookmarks = () => {
  const { user } = useAuth();
  const [ids, setIds] = useState(cache || []);

  useEffect(() => {
    const listener = (next) => setIds(next || []);
    listeners.add(listener);
    if (user && cache === null) {
      cache = [];
      studentApi
        .bookmarkIds()
        .then((d) => {
          cache = d.ids;
          publish();
        })
        .catch(() => {
          cache = [];
        });
    }
    if (!user) {
      cache = null;
      setIds([]);
    }
    return () => listeners.delete(listener);
  }, [user]);

  const toggle = async (resourceId) => {
    const saved = (cache || []).includes(resourceId);
    try {
      if (saved) {
        await studentApi.removeBookmark(resourceId);
        cache = (cache || []).filter((id) => id !== resourceId);
        toast.success("Removed from your shelf");
      } else {
        await studentApi.addBookmark(resourceId);
        cache = [...(cache || []), resourceId];
        toast.success("Saved to your shelf");
      }
      publish();
    } catch {
      toast.error("Could not update your shelf. Please try again.");
    }
  };

  return { ids, toggle, isSaved: (id) => ids.includes(id) };
};

export const clearBookmarkCache = () => {
  cache = null;
  publish();
};

export const BookmarkButton = ({ resourceId }) => {
  const { user } = useAuth();
  const { isSaved, toggle } = useBookmarks();
  if (!user) return null;

  const saved = isSaved(resourceId);
  return (
    <button
      type="button"
      onClick={() => toggle(resourceId)}
      aria-pressed={saved}
      aria-label={saved ? "Remove from my shelf" : "Save to my shelf"}
      data-testid={`bookmark-toggle-${resourceId}`}
      className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors duration-200 ${
        saved
          ? "border-brand-accent/50 bg-brand-accent/12 text-brand-accent"
          : "border-brand-line text-muted hover:text-fg"
      }`}
    >
      {saved ? (
        <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Bookmark className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
};
