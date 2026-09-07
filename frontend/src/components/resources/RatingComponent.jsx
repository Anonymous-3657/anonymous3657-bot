import { useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { ratingApi } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function RatingComponent({ targetId, targetType, currentRating, reviewCount }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login to rate");
      return;
    }
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        rating,
        review: review.trim() || undefined,
      };
      if (targetType === "pdf") {
        payload.pdf_id = targetId;
      } else {
        payload.resource_id = targetId;
      }

      await ratingApi.submit(payload);
      toast.success("Rating submitted!");
      setShowForm(false);
      setRating(0);
      setReview("");
      // Reload page to show updated rating
      window.location.reload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-line bg-brand-surface p-6">
      <h3 className="font-heading text-lg font-semibold text-fg">Rate this {targetType}</h3>

      {/* Current Rating Display */}
      {currentRating && reviewCount > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(currentRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted">
            {currentRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
          </span>
        </div>
      )}

      {/* Rate Button / Form */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90"
        >
          Write a review
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Star Rating */}
          <div>
            <label className="text-sm text-muted">Your rating</label>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted"
                    }`}
                  />
                </motion.button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="text-sm text-muted">Your review (optional)</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your thoughts about this resource..."
              rows={3}
              maxLength={1000}
              className="mt-2 w-full rounded-lg border border-brand-line bg-brand-elevated px-3 py-2 text-sm text-fg outline-none focus:border-brand-primary"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setRating(0);
                setReview("");
              }}
              className="rounded-lg border border-brand-line px-4 py-2 text-sm text-muted hover:text-fg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
