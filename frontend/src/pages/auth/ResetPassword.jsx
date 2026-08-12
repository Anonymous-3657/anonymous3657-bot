import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormAlert, PasswordField, SubmitButton } from "@/components/auth/FormControls";
import { PasswordStrength, passwordScore } from "@/components/auth/PasswordStrength";
import { StateView } from "@/components/common/StateViews";
import { errorMessage } from "@/context/AuthContext";
import { http } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useSeo({ title: "Reset password — CG STUDENT PORTAL", path: "/reset-password" });

  if (!token) {
    return (
      <AuthLayout title="Reset link missing" testId="reset-password-page">
        <StateView
          icon="LinkIcon"
          tone="warning"
          title="This reset link is incomplete"
          description="Open the link directly from your email, or request a new one."
          actionLabel="Request a new link"
          actionTo="/forgot-password"
          testId="reset-token-missing"
        />
      </AuthLayout>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldError("");
    if (passwordScore(password) < 4) {
      setFieldError("Use 8+ characters with upper, lower case and a number");
      return;
    }
    if (password !== confirm) {
      setFieldError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { data } = await http.post("/auth/reset-password", {
        token,
        password,
        confirm_password: confirm,
      });
      setMessage(data.message);
      setTimeout(() => navigate("/login", { replace: true }), 1600);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Make it strong — you will use this to sign in."
      testId="reset-password-page"
      footer={
        <Link to="/login" className="text-brand-primary hover:text-fg">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate data-testid="reset-form" className="space-y-5">
        <div>
          <PasswordField
            id="reset-password"
            label="New password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldError}
          />
          <PasswordStrength value={password} />
        </div>

        <PasswordField
          id="reset-confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <FormAlert testId="reset-error">{error}</FormAlert>
        <FormAlert tone="success" testId="reset-success">
          {message}
        </FormAlert>

        <SubmitButton busy={busy} testId="reset-submit">
          {busy ? "Updating…" : "Update password"}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
