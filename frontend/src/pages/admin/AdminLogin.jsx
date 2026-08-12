import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { formatApiError, useAuth } from "@/context/AuthContext";
import { useSeo } from "@/hooks/useSeo";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useSeo({ title: "Admin sign in — CG STUDENT PORTAL", path: "/admin/login" });

  if (user) return <Navigate to="/admin" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-bg">
      <div className="border-b border-brand-line">
        <div className="container-page flex h-16 items-center">
          <Logo />
        </div>
      </div>

      <div className="container-page flex flex-1 items-center justify-center py-16">
        <div className="w-full max-w-md rounded-2xl border border-brand-line bg-brand-surface p-8">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-primary/12">
            <ShieldCheck className="h-5 w-5 text-brand-primary" aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-heading text-2xl font-semibold tracking-tight text-fg">
            Admin sign in
          </h1>
          <p className="mt-2 text-sm text-muted">
            Restricted area. Only platform staff accounts can sign in here.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="admin-email" className="font-heading text-sm font-medium text-fg">
                Email
              </label>
              <input
                id="admin-email"
                data-testid="admin-login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-brand-line bg-brand-elevated px-4 text-sm text-fg outline-none transition-colors duration-200 placeholder:text-muted focus:border-brand-primary"
                placeholder="admin@cgstudentportal.in"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="font-heading text-sm font-medium text-fg">
                Password
              </label>
              <input
                id="admin-password"
                data-testid="admin-login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-brand-line bg-brand-elevated px-4 text-sm text-fg outline-none transition-colors duration-200 focus:border-brand-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                data-testid="admin-login-error"
                role="alert"
                className="rounded-xl border border-brand-error/40 bg-brand-error/10 px-4 py-3 text-sm text-brand-error"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              data-testid="admin-login-submit"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-primary font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              )}
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
