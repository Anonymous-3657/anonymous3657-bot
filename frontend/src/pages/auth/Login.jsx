import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  Lock,
  Mail,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
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

/** Field entrance animation variants (stagger). */
const fieldVariants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: 0.35 + i * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

/** Animated floating logo orb behind the title. */
const Orb = ({ className, delay = 0 }) => (
  <motion.span
    aria-hidden="true"
    className={`absolute rounded-full blur-2xl ${className}`}
    animate={{
      scale: [1, 1.15, 0.95, 1.08, 1],
      opacity: [0.4, 0.7, 0.5, 0.75, 0.4],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
      delay,
    }}
  />
);

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
      setTimeout(() => navigate(next, { replace: true }), reduced ? 0 : 900);
    } catch (err) {
      setError(errorMessage(err));
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  /** Playful shake sequence on error. */
  const shakeAnimation = reduced || !shake
    ? {}
    : {
        x: [0, -14, 12, -10, 8, -4, 4, 0],
        rotate: [0, -1.5, 1.2, -0.8, 0.5, 0],
      };
  const shakeTransition = { duration: 0.55, ease: "easeInOut" };

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
            className="font-medium text-brand-primary transition-all duration-200 hover:text-fg hover:underline underline-offset-4"
          >
            Create Account
          </Link>
        </>
      }
    >
      {/* Animated decorative orb behind the title area */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-40 -translate-x-1/2" aria-hidden="true">
        {!reduced && (
          <>
            <Orb className="inset-0 bg-brand-primary/30" delay={0} />
            <Orb className="inset-4 bg-brand-accent2/25" delay={1.2} />
          </>
        )}
      </div>

      {/* Animated logo badge */}
      <motion.div
        className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center"
        initial={reduced ? {} : { opacity: 0, scale: 0.6, rotate: -180 }}
        animate={{
          opacity: 1,
          scale: 1,
          rotate: 0,
        }}
        transition={{
          duration: 0.7,
          delay: 0.1,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {/* Pulsing ring */}
        {!reduced && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-brand-primary/40"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        {/* Gradient background */}
        <motion.span
          className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-primary via-brand-primaryDark to-brand-accent2"
          animate={reduced ? {} : { rotate: 360 }}
          transition={reduced ? {} : { duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <span className="absolute inset-[2px] rounded-full bg-brand-surface" />
        <motion.div
          animate={reduced ? {} : { y: [0, -3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {done ? (
            <CheckCircle2 className="relative h-7 w-7 text-brand-success" />
          ) : (
            <Sparkles className="relative h-7 w-7 text-brand-primary" />
          )}
        </motion.div>
      </motion.div>

      <motion.form
        onSubmit={onSubmit}
        noValidate
        data-testid="login-form"
        key={shake}
        animate={shakeAnimation}
        transition={shakeTransition}
        className="relative space-y-5"
      >
        {/* Email field */}
        <motion.div
          custom={0}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="group relative"
        >
          <div className="pointer-events-none absolute left-4 top-[46px] z-10 text-muted transition-colors duration-200 group-focus-within:text-brand-primary">
            <Mail className="h-4 w-4" />
          </div>
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
            className="[&_input]:pl-11"
          />
          {/* Focus glow */}
          {!reduced && (
            <motion.span
              className="pointer-events-none absolute -inset-1 rounded-xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
              style={{
                boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.18), 0 0 20px rgba(37, 99, 235, 0.08)",
              }}
              aria-hidden="true"
            />
          )}
        </motion.div>

        {/* Password field */}
        <motion.div
          custom={1}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="group relative"
        >
          <div className="pointer-events-none absolute left-4 top-[46px] z-10 text-muted transition-colors duration-200 group-focus-within:text-brand-primary">
            <Lock className="h-4 w-4" />
          </div>
          <PasswordField
            id="login-password"
            label="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="[&_input]:pl-11"
          />
          {!reduced && (
            <motion.span
              className="pointer-events-none absolute -inset-1 rounded-xl opacity-0 transition-opacity duration-300 group-focus-within:opacity-100"
              style={{
                boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.18), 0 0 20px rgba(37, 99, 235, 0.08)",
              }}
              aria-hidden="true"
            />
          )}
        </motion.div>

        {/* Animated divider */}
        <motion.div
          custom={2}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3"
        >
          <motion.span
            className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-line to-transparent"
            initial={reduced ? {} : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
          />
        </motion.div>

        {/* Remember / Forgot */}
        <motion.div
          custom={3}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center justify-between gap-4"
        >
          <label
            htmlFor="login-remember"
            className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm text-muted transition-colors duration-200 hover:text-fg"
          >
            <motion.span
              whileTap={reduced ? {} : { scale: 0.9 }}
              className="inline-flex"
            >
              <input
                id="login-remember"
                data-testid="login-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 accent-[color:var(--brand-primary)]"
              />
            </motion.span>
            Remember me
          </label>
          <Link
            to="/forgot-password"
            data-testid="login-forgot-link"
            className="relative text-sm font-medium text-brand-primary transition-colors duration-200 hover:text-fg"
          >
            Forgot password?
            {!reduced && (
              <motion.span
                className="absolute -bottom-0.5 left-0 h-px w-0 bg-current transition-all duration-300 group-hover:w-full"
                style={{ width: "0%" }}
                whileHover={{ width: "100%" }}
              />
            )}
          </Link>
        </motion.div>

        {/* Terms checkboxes */}
        <motion.div
          custom={4}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="space-y-1 border-t border-brand-line pt-4"
        >
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
        </motion.div>

        {/* Alerts with animated entrance */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key={`error-${shake}`}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <FormAlert testId="login-error">{error}</FormAlert>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <FormAlert tone="success" testId="login-success">
                <span className="inline-flex items-center gap-2">
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                    className="inline-flex"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </motion.span>
                  Signed in. Taking you to your dashboard…
                </span>
              </FormAlert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.div custom={5} variants={fieldVariants} initial="hidden" animate="visible">
          <motion.div whileTap={reduced ? {} : { scale: 0.98 }} transition={{ duration: 0.1 }}>
            <SubmitButton busy={busy} testId="login-submit">
              <span className="inline-flex items-center gap-2">
                {busy ? (
                  <>
                    Signing in
                    <motion.span
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      …
                    </motion.span>
                  </>
                ) : (
                  <>
                    Sign In
                    {!reduced && (
                      <motion.span
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-block"
                      >
                        →
                      </motion.span>
                    )}
                  </>
                )}
              </span>
            </SubmitButton>
          </motion.div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          custom={6}
          variants={fieldVariants}
          initial="hidden"
          animate="visible"
          className="text-center text-xs text-muted/60"
        >
          Google sign-in is not enabled yet on this platform.
        </motion.p>
      </motion.form>
    </AuthLayout>
  );
}
