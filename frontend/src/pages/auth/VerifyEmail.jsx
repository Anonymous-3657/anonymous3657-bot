import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BadgeCheck, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormAlert, SubmitButton, TextInput } from "@/components/auth/FormControls";
import { errorMessage, useAuth } from "@/context/AuthContext";
import { http } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const { user, checkSession } = useAuth();

  const [state, setState] = useState(token ? "verifying" : "pending");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");

  useSeo({ title: "Verify your email — CG STUDENT PORTAL", path: "/verify-email" });

  useEffect(() => {
    if (!token) return;
    http
      .post("/auth/verify-email", { token })
      .then(async ({ data }) => {
        setMessage(data.message);
        setState("verified");
        await checkSession();
      })
      .catch((err) => {
        setError(errorMessage(err));
        setState("failed");
      });
  }, [token, checkSession]);

  const resend = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await http.post("/auth/resend-verification");
      setMessage(data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const requestOtp = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await http.post("/auth/request-otp", { purpose: "email_otp" });
      setMessage(data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await http.post("/auth/verify-otp", { purpose: "email_otp", code: otp });
      setMessage(data.message);
      setState("verified");
      await checkSession();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (state === "verified" || user?.email_verified) {
    return (
      <AuthLayout title="Email verified" testId="verify-email-page">
        <div className="text-center" data-testid="verify-email-success">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-success/12">
            <BadgeCheck className="h-6 w-6 text-brand-success" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm text-muted">
            {message || "Your email address is confirmed."}
          </p>
          <Link
            to="/dashboard"
            data-testid="verify-email-to-dashboard"
            className="mt-7 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-primary font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
          >
            Go to my dashboard
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (state === "verifying") {
    return (
      <AuthLayout title="Verifying your email…" testId="verify-email-page">
        <div className="flex items-center gap-3 text-sm text-muted" data-testid="verify-email-loading">
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-brand-primary/40 border-t-brand-primary"
            aria-hidden="true"
          />
          Confirming your link.
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        user?.email
          ? `We sent a verification link to ${user.email}.`
          : "Open the verification link we emailed you."
      }
      testId="verify-email-page"
      footer={
        <Link to="/dashboard" className="text-brand-primary hover:text-fg">
          Continue to dashboard
        </Link>
      }
    >
      <div className="space-y-6" data-testid="verify-email-pending">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-primary/12">
          <MailCheck className="h-6 w-6 text-brand-primary" aria-hidden="true" />
        </span>

        <FormAlert testId="verify-email-error">{error}</FormAlert>
        <FormAlert tone="success" testId="verify-email-message">
          {message}
        </FormAlert>

        {user && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resend}
                disabled={busy}
                data-testid="verify-email-resend"
                className="min-h-[48px] flex-1 rounded-xl border border-brand-line px-5 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated disabled:opacity-60"
              >
                Resend email
              </button>
              <button
                type="button"
                onClick={requestOtp}
                disabled={busy}
                data-testid="verify-email-request-otp"
                className="min-h-[48px] flex-1 rounded-xl border border-brand-line px-5 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated disabled:opacity-60"
              >
                Send me a code instead
              </button>
            </div>

            <form onSubmit={submitOtp} className="space-y-4 border-t border-brand-line pt-6">
              <TextInput
                id="verify-otp-code"
                label="6-digit code"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                hint="Codes expire in 10 minutes."
              />
              <SubmitButton busy={busy} testId="verify-otp-submit" disabled={otp.length !== 6}>
                Verify code
              </SubmitButton>
            </form>

            <p className="text-center text-xs text-muted/60">
              Wrong address?{" "}
              <Link to="/profile" data-testid="verify-email-change" className="text-brand-primary hover:text-fg">
                Change your email
              </Link>
            </p>
          </>
        )}

        {!user && (
          <Link
            to="/login"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-primary font-heading text-sm font-medium text-white"
          >
            Sign in to resend
          </Link>
        )}
      </div>
    </AuthLayout>
  );
}
