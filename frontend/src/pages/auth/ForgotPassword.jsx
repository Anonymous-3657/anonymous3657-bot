import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormAlert, SubmitButton, TextInput } from "@/components/auth/FormControls";
import { errorMessage } from "@/context/AuthContext";
import { http } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useSeo({
    title: "Forgot password — CG STUDENT PORTAL",
    description: "Request a secure password reset link for your CG STUDENT PORTAL account.",
    path: "/forgot-password",
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const { data } = await http.post("/auth/forgot-password", { email: email.trim() });
      setMessage(data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a secure reset link."
      testId="forgot-password-page"
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" data-testid="forgot-to-login" className="text-brand-primary hover:text-fg">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate data-testid="forgot-form" className="space-y-5">
        <TextInput
          id="forgot-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <FormAlert testId="forgot-error">{error}</FormAlert>
        <FormAlert tone="success" testId="forgot-success">
          {message}
        </FormAlert>

        <SubmitButton busy={busy} testId="forgot-submit">
          {busy ? "Sending…" : "Send reset link"}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
