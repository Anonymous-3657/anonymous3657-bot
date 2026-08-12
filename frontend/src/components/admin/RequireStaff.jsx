import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UnauthorizedState } from "@/components/common/StateViews";

const STAFF_ROLES = ["admin", "moderator"];

export const RequireStaff = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (user === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand-bg" data-testid="auth-checking">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
      </div>
    );
  }

  if (user === false) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return (
      <div className="container-page py-24">
        <UnauthorizedState />
      </div>
    );
  }

  return children;
};
