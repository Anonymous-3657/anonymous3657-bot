import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { StateView } from "@/components/common/StateViews";
import { AppShell } from "@/components/layout/AppShell";

const Checking = () => (
  <div className="grid min-h-screen place-items-center bg-brand-bg" data-testid="auth-checking">
    <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
  </div>
);

/** Client guard for authenticated pages. The server enforces access independently. */
export const RequireAuth = ({ children, roles, requireVerified = false }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (user === null) return <Checking />;
  if (user === false) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <AppShell>
        <div className="container-page py-24">
          <StateView
            icon="Lock"
            tone="warning"
            title="You do not have access to this area"
            description="Your account role does not include these permissions."
            actionLabel="Go to dashboard"
            actionTo="/dashboard"
            testId="forbidden-state"
          />
        </div>
      </AppShell>
    );
  }

  if (requireVerified && !user.email_verified) {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
};
