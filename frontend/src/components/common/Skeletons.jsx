export const SkeletonBlock = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-brand-elevated ${className}`} aria-hidden="true" />
);

export const CardSkeletonGrid = ({ count = 6, testId = "loading-skeleton" }) => (
  <div
    data-testid={testId}
    role="status"
    aria-label="Loading"
    className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="surface-card rounded-2xl p-6">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="mt-4 h-5 w-full" />
        <SkeletonBlock className="mt-2 h-5 w-2/3" />
        <SkeletonBlock className="mt-6 h-3 w-1/2" />
      </div>
    ))}
  </div>
);
