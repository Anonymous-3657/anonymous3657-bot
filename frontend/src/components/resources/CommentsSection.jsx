import { useState, useEffect } from "react";
import { MessageSquare, ThumbsUp, ThumbsDown, Reply, Send } from "lucide-react";
import { motion } from "framer-motion";
import { commentsApi } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function CommentsSection({ targetId, targetType }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sort, setSort] = useState("recent"); // recent or popular

  useEffect(() => {
    loadComments();
  }, [targetId, targetType, sort]);

  const loadComments = async () => {
    setLoading(true);
    try {
      let data;
      if (targetType === "pdf") {
        data = await commentsApi.getPdfComments(targetId, { sort });
      } else {
        data = await commentsApi.getResourceComments(targetId, { sort });
      }
      setComments(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to load comments", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    if (!newComment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { content: newComment.trim() };
      if (targetType === "pdf") {
        payload.pdf_id = targetId;
      } else {
        payload.resource_id = targetId;
      }

      await commentsApi.add(payload);
      toast.success("Comment added!");
      setNewComment("");
      loadComments();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim()) {
      toast.error("Please write a reply");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        content: replyText.trim(),
        parent_id: parentId,
      };
      if (targetType === "pdf") {
        payload.pdf_id = targetId;
      } else {
        payload.resource_id = targetId;
      }

      await commentsApi.add(payload);
      toast.success("Reply added!");
      setReplyTo(null);
      setReplyText("");
      loadComments();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId, voteType) => {
    if (!user) {
      toast.error("Please login to vote");
      return;
    }

    try {
      await commentsApi.vote(commentId, { vote_type: voteType });
      loadComments();
    } catch (e) {
      toast.error("Failed to vote");
    }
  };

  return (
    <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold text-fg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({total})
        </h3>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-brand-line bg-brand-elevated px-3 py-1.5 text-sm text-fg outline-none"
        >
          <option value="recent">Most Recent</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* New Comment Form */}
      {user && (
        <div className="mt-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-brand-line bg-brand-elevated px-3 py-2 text-sm text-fg outline-none focus:border-brand-primary"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={submitting || !newComment.trim()}
              className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-brand-line" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-brand-line bg-brand-elevated p-4"
            >
              {/* Comment Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-primary/10 text-sm font-bold text-brand-primary">
                    {comment.user_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fg">{comment.user_name}</p>
                    <p className="text-xs text-muted">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comment Content */}
              <p className="mt-3 text-sm text-fg">{comment.content}</p>

              {/* Comment Actions */}
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleVote(comment.id, "up")}
                  className="flex items-center gap-1 text-xs text-muted hover:text-brand-success"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {comment.upvotes > 0 && <span>{comment.upvotes}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => handleVote(comment.id, "down")}
                  className="flex items-center gap-1 text-xs text-muted hover:text-brand-error"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  {comment.downvotes > 0 && <span>{comment.downvotes}</span>}
                </button>
                {user && (
                  <button
                    type="button"
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="flex items-center gap-1 text-xs text-muted hover:text-brand-primary"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Reply
                  </button>
                )}
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-3 border-l-2 border-brand-line pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="rounded-lg bg-brand-surface p-3">
                      <div className="flex items-center gap-2">
                        <div className="grid h-6 w-6 place-items-center rounded-full bg-brand-accent/10 text-xs font-bold text-brand-accent">
                          {reply.user_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-fg">{reply.user_name}</p>
                          <p className="text-xs text-muted">
                            {new Date(reply.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-fg">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {replyTo === comment.id && (
                <div className="mt-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={2}
                    maxLength={1000}
                    className="w-full rounded-lg border border-brand-line bg-brand-surface px-3 py-2 text-sm text-fg outline-none focus:border-brand-primary"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={submitting || !replyText.trim()}
                      className="rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
                    >
                      {submitting ? "Posting..." : "Post Reply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyText("");
                      }}
                      className="rounded-lg border border-brand-line px-3 py-1.5 text-xs text-muted hover:text-fg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
