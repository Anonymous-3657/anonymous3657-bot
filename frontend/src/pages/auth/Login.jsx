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

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

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
    description:
      "Sign in to CG STUDENT PORTAL to continue your learning journey.",
    path: "/login",
  });

  const next = params.get("next") || "/dashboard";

  if (user) return <Navigate to={next} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!acceptTerms || !acceptPrivacy) {
      setError(
        "Please accept the Terms & Conditions and Privacy Policy to continue."
      );
      setShake((s) => s + 1);
      return;
    }

    setBusy(true);

    try {
      await login(email.trim(), password);
      setDone(true);

      setTimeout(
        () => navigate(next, { replace: true }),
        reduced ? 0 : 650
      );
    } catch (err) {
      setError(errorMessage(err));
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  const animationProps = reduced
    ? {
        initial: false,
        animate: false,
      }
    : {
        initial: "hidden",
        animate: "visible",
      };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Continue your learning journey."
      testId="login-page"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            data-testid="login-to-register"
            className="font-medium text-brand-primary transition-colors duration-200 hover:text-fg"
          >
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
        className="relative space-y-5 overflow-hidden"
        {...animationProps}
        variants={containerVariants}
        animate={
          reduced
            ? false
            : shake
              ? { x: [0, -9, 8, -5, 0] }
              : "visible"
        }
        transition={
          shake
            ? { duration: 0.34 }
            : {
                duration: 0.55,
                ease: "easeOut",
                staggerChildren: 0.08,
              }
        }
      >
        {/* Decorative animated glow */}
        {!reduced && (
          <>
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-brand-primary/10 blur-3xl"
              animate={{
                scale: [1, 1.18, 1],
                opacity: [0.45, 0.7, 0.45],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-16 h-36 w-36 rounded-full bg-brand-primary/5 blur-3xl"
              animate={{
                scale: [1.15, 1, 1.15],
                opacity: [0.35, 0.6, 0.35],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </>
        )}

        {/* Secure access badge */}
        <motion.div
          variants={itemVariants}
          className="relative flex items-center justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-primary/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-brand-primary">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-brand-primary"
              animate={
                reduced
                  ? {}
                  : {
                      opacity: [0.45, 1, 0.45],
                      scale: [0.9, 1.2, 0.9],
                    }
              }
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            Secure Student Access
          </div>
        </motion.div>

        {/* Email */}
        <motion.div
          variants={itemVariants}
          whileHover={reduced ? undefined : { y: -1 }}
          transition={{ duration: 0.2 }}
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
        </motion.div>

        {/* Password */}
        <motion.div
          variants={itemVariants}
          whileHover={reduced ? undefined : { y: -1 }}
          transition={{ duration: 0.2 }}
        >
          <PasswordField
            id="login-password"
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </motion.div>

        {/* Remember / Forgot */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between gap-4"
        >
          <label
            htmlFor="login-remember"
            className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
          >
            <input
              id="login-remember"
              data-testid="login-remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-[color:var(--brand-primary)]"
            />
            Remember me
          </label>

          <Link
            to="/forgot-password"
            data-testid="login-forgot-link"
            className="text-sm font-medium text-brand-primary transition-all duration-200 hover:-translate-y-0.5 hover:text-fg"
          >
            Forgot password?
          </Link>
        </motion.div>

        {/* Terms & Privacy */}
        <motion.div
          variants={itemVariants}
          className="relative space-y-1.5 rounded-xl border border-brand-line bg-brand-primary/[0.025] p-3.5"
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
              ✓
            </span>
            Account agreement
          </div>

          <Checkbox
            id="login-accept-terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            label={
              <>
                I accept the{" "}
                <Link
                  to="/legal/terms"
                  target="_blank"
                  className="font-medium text-brand-primary transition-colors hover:text-fg"
                >
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
                <Link
                  to="/legal/privacy"
                  target="_blank"
                  className="font-medium text-brand-primary transition-colors hover:text-fg"
                >
                  Privacy Policy
                </Link>
              </>
            }
          />
        </motion.div>

        {/* Error */}
        <motion.div
          variants={itemVariants}
          initial={false}
          animate={
            error && !reduced
              ? {
                  opacity: 1,
                  scale: [0.98, 1.02, 1],
                }
              : {
                  opacity: 1,
                  scale: 1,
                }
          }
          transition={{ duration: 0.25 }}
        >
          <FormAlert testId="login-error">{error}</FormAlert>
        </motion.div>

        {/* Success */}
        {done && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <FormAlert tone="success" testId="login-success">
              Signed in. Taking you to your dashboard…
            </FormAlert>
          </motion.div>
        )}

        {/* Submit */}
        <motion.div
          variants={itemVariants}
          whileHover={reduced || busy ? undefined : { scale: 1.015 }}
          whileTap={reduced || busy ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.18 }}
        >
          <SubmitButton busy={busy} testId="login-submit">
            {busy ? "Signing in…" : "Sign In"}
          </SubmitButton>
        </motion.div>

        {/* Security note */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-center gap-2 pt-1 text-center"
        >
          <span className="text-xs text-muted/50">●</span>
          <p className="text-xs text-muted/60">
            Your account information is securely handled.
          </p>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-center text-[11px] text-muted/45"
        >
          Google sign-in is not enabled yet on this platform.
        </motion.p>
      </motion.form>
    </AuthLayout>
  );
}