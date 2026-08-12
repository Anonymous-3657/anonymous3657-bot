import * as Icons from "lucide-react";
import { Link } from "react-router-dom";

const Wrapper = ({ children, testId }) => (
  <div
    data-testid={testId}
    className="flex flex-col items-start gap-4 rounded-2xl border border-brand-line bg-brand-surface px-6 py-12 text-left sm:items-center sm:text-center"
  >
    {children}
  </div>
);

export const StateView = ({
  icon = "Inbox",
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  tone = "muted",
  testId = "state-view",
}) => {
  const Icon = Icons[icon] || Icons.Inbox;
  const toneColor = {
    muted: "text-muted",
    error: "text-brand-error",
    warning: "text-brand-warning",
    info: "text-brand-info",
  }[tone];

  return (
    <Wrapper testId={testId}>
      <span className="grid h-12 w-12 place-items-center rounded-xl border border-brand-line bg-brand-elevated">
        <Icon className={`h-6 w-6 ${toneColor}`} aria-hidden="true" />
      </span>
      <h3 className="font-heading text-lg font-semibold text-fg">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          data-testid={`${testId}-action`}
          className="mt-2 inline-flex min-h-[44px] items-center rounded-xl bg-brand-primary px-5 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button
          type="button"
          onClick={onAction}
          data-testid={`${testId}-action`}
          className="mt-2 inline-flex min-h-[44px] items-center rounded-xl bg-brand-primary px-5 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
        >
          {actionLabel}
        </button>
      )}
    </Wrapper>
  );
};

export const EmptyState = (props) => (
  <StateView icon="SearchX" title="Nothing here yet" testId="empty-state" {...props} />
);

export const ErrorState = ({ onRetry, description }) => (
  <StateView
    icon="TriangleAlert"
    tone="error"
    title="Something went wrong"
    description={description || "We could not load this content. Please try again."}
    actionLabel="Retry"
    onAction={onRetry}
    testId="error-state"
  />
);

export const NotFoundState = () => (
  <StateView
    icon="Compass"
    title="Page not found"
    description="The page you are looking for does not exist or has been moved."
    actionLabel="Back to home"
    actionTo="/"
    testId="not-found-state"
  />
);

export const UnauthorizedState = () => (
  <StateView
    icon="Lock"
    tone="warning"
    title="You do not have access to this area"
    description="Your account does not have permission to open the admin panel."
    actionLabel="Go to my dashboard"
    actionTo="/dashboard"
    testId="unauthorized-state"
  />
);

export const OfflineState = ({ onRetry }) => (
  <StateView
    icon="WifiOff"
    tone="warning"
    title="You are offline"
    description="Check your internet connection and try again."
    actionLabel="Retry"
    onAction={onRetry}
    testId="offline-state"
  />
);

export const ServerErrorState = ({ onRetry }) => (
  <StateView
    icon="ServerCrash"
    tone="error"
    title="Server error"
    description="Our servers hit a problem. We are on it — try again shortly."
    actionLabel="Retry"
    onAction={onRetry}
    testId="server-error-state"
  />
);
