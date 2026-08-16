import { useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  Checkbox,
  FormAlert,
  PasswordField,
  SubmitButton,
  TextInput,
} from "@/components/auth/FormControls";
import { errorMessage, useAuth } from "@/context/AuthContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSeo } from "@/hooks/useSeo";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reduced = usePrefersReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [done, setDone] = useState(false);

  useSeo({
    title: "Sign in — CG STUDENT PORTAL",
    description: "Sign in to CG STUDENT PORTAL to continue your learning journey.",
    path: "/login",
  });

  const next = params.get("next") || "/dashboard";
  if (user) return <Navigate to={next} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!acceptTerms || !acceptPrivacy) {
      setError("Please accept the Terms & Conditions and Privacy Policy to continue.");
      setShake((s) => s + 1);
      return;
    }

    setBusy(true);
    try {
      await login(email.trim(), password);
      setDone(true);
      setTimeout(() => navigate(next, { replace: true }), reduced ? 0 : 550);
    } catch (err) {
      setError(errorMessage(err));
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Continue your learning journey."
      testId="login-page"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/register" data-testid="login-to-register" className="text-brand-primary hover:text-fg">
            Create Account
          </Link>
        </>
      }
    >
      <motion.form
        onSubmit={onSubmit}
        noValidate
        data-testid="login-form"
        key={shake}
        animate={reduced || !shake ? {} : { x: [0, -9, 8, -5, 0] }}
        transition={{ duration: 0.34 }}
        className="space-y-5"
      >
        <TextInput
          id="login-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div className="flex items-center justify-between gap-4">
          <label htmlFor="login-remember" className="flex min-h-[44px] items-center gap-2.5 text-sm text-muted">
            <input
              id="login-remember"
              data-testid="login-remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--brand-primary)]"
            />
            Remember me
          </label>
          <Link
            to="/forgot-password"
            data-testid="login-forgot-link"
            className="text-sm text-brand-primary transition-colors duration-200 hover:text-fg"
          >
            Forgot password?
          </Link>
        </div>

        <div className="space-y-1 border-t border-brand-line pt-4">
          <Checkbox
            id="login-accept-terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            label={
              <>
                I accept the{" "}
                <Link to="/legal/terms" target="_blank" className="text-brand-primary hover:text-fg">
                  Terms &amp; Conditions
                </Link>
              </>
            }
          />
          <Checkbox
            id="login-accept-privacy"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            label={
              <>
                I accept the{" "}
                <Link to="/legal/privacy" target="_blank" className="text-brand-primary hover:text-fg">
                  Privacy Policy
                </Link>
              </>
            }
          />
        </div>

        <FormAlert testId="login-error">{error}</FormAlert>
        {done && (
          <FormAlert tone="success" testId="login-success">
            Signed in. Taking you to your dashboard…
          </FormAlert>
        )}

        <SubmitButton busy={busy} testId="login-submit">
          {busy ? "Signing in…" : "Sign In"}
        </SubmitButton>

        <p className="text-center text-xs text-muted/60">
          Google sign-in is not enabled yet on this platform.
        </p>
      </motion.form>
    </AuthLayout>
  );
}
