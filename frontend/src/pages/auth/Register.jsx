import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  Checkbox,
  FormAlert,
  PasswordField,
  SelectInput,
  SubmitButton,
  TextInput,
} from "@/components/auth/FormControls";
import { PasswordStrength, passwordScore } from "@/components/auth/PasswordStrength";
import { errorMessage, useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useSeo } from "@/hooks/useSeo";

const BLANK = {
  name: "",
  username: "",
  email: "",
  phone: "",
  password: "",
  confirm_password: "",
  university_id: "",
  college_id: "",
  course_id: "",
  semester_or_year: "",
  accept_terms: false,
  accept_privacy: false,
};

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();

  const [form, setForm] = useState(BLANK);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [catalog, setCatalog] = useState({ universities: [], colleges: [], courses: [], subjects: [] });

  useSeo({
    title: "Create your account — CG STUDENT PORTAL",
    description: "Join CG STUDENT PORTAL to find papers, notes and syllabus for your course.",
    path: "/register",
  });

  useEffect(() => {
    api.universities({ limit: 50 }).then((d) => setCatalog((c) => ({ ...c, universities: d.items })));
  }, []);

  useEffect(() => {
    if (!form.university_id) {
      setCatalog((c) => ({ ...c, colleges: [], courses: [] }));
      return;
    }
    Promise.all([
      api.courses({ university_id: form.university_id, limit: 100 }),
      api.colleges ? api.colleges({ university_id: form.university_id, limit: 100 }) : Promise.resolve({ items: [] }),
    ]).then(([courses, colleges]) =>
      setCatalog((c) => ({ ...c, courses: courses.items, colleges: colleges.items })),
    );
  }, [form.university_id]);

  const semesters = useMemo(() => {
    const course = catalog.courses.find((c) => c.id === form.course_id);
    if (!course) return [];
    const years = Number.parseInt(course.duration, 10) || 3;
    return Array.from({ length: years * 2 }, (_, i) => `Semester ${i + 1}`);
  }, [catalog.courses, form.course_id]);

  if (user) return <Navigate to="/verify-email" replace />;

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
  };

  const validate = () => {
    const errors = {};
    if (form.name.trim().length < 2) errors.name = "Enter your full name";
    if (!/^[a-z0-9_]{3,24}$/.test(form.username.trim().toLowerCase()))
      errors.username = "3-24 characters: letters, numbers or underscore";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Enter a valid email address";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").replace(/^91/, "")))
      errors.phone = "Enter a valid 10-digit Indian mobile number";
    if (passwordScore(form.password) < 4)
      errors.password = "Use 8+ characters with upper, lower case and a number";
    if (form.password !== form.confirm_password)
      errors.confirm_password = "Passwords do not match";
    if (!form.university_id) errors.university_id = "Select your university";
    if (!form.course_id) errors.course_id = "Select your course";
    if (!form.semester_or_year) errors.semester_or_year = "Select your semester or year";
    if (!form.accept_terms) errors.accept_terms = "Please accept the Terms & Conditions";
    if (!form.accept_privacy) errors.accept_privacy = "Please accept the Privacy Policy";
    return errors;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setShake((s) => s + 1);
      return;
    }

    setBusy(true);
    try {
      await register({ ...form, username: form.username.trim().toLowerCase() });
      navigate("/verify-email", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Study, earn and grow with CG STUDENT PORTAL."
      testId="register-page"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" data-testid="register-to-login" className="text-brand-primary hover:text-fg">
            Sign In
          </Link>
        </>
      }
    >
      <motion.form
        onSubmit={onSubmit}
        noValidate
        data-testid="register-form"
        key={shake}
        animate={reduced || !shake ? {} : { x: [0, -9, 8, -5, 0] }}
        transition={{ duration: 0.34 }}
        className="space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            id="register-name"
            label="Full name"
            autoComplete="name"
            required
            value={form.name}
            onChange={set("name")}
            error={fieldErrors.name}
          />
          <TextInput
            id="register-username"
            label="Username"
            autoComplete="username"
            required
            value={form.username}
            onChange={set("username")}
            error={fieldErrors.username}
          />
          <TextInput
            id="register-email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={set("email")}
            error={fieldErrors.email}
          />
          <TextInput
            id="register-phone"
            label="Phone number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            maxLength={13}
            value={form.phone}
            onChange={set("phone")}
            error={fieldErrors.phone}
            hint="10-digit Indian mobile"
          />
        </div>

        <div>
          <PasswordField
            id="register-password"
            label="Password"
            autoComplete="new-password"
            required
            value={form.password}
            onChange={set("password")}
            error={fieldErrors.password}
          />
          <PasswordStrength value={form.password} />
        </div>

        <PasswordField
          id="register-confirm-password"
          label="Confirm password"
          autoComplete="new-password"
          required
          value={form.confirm_password}
          onChange={set("confirm_password")}
          error={fieldErrors.confirm_password}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectInput
            id="register-university"
            label="University"
            required
            value={form.university_id}
            onChange={set("university_id")}
            error={fieldErrors.university_id}
            placeholder="Select university"
            options={catalog.universities.map((u) => ({ value: u.id, label: u.name }))}
          />
          <SelectInput
            id="register-college"
            label="College"
            value={form.college_id}
            onChange={set("college_id")}
            placeholder={form.university_id ? "Select college (optional)" : "Select university first"}
            options={catalog.colleges.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectInput
            id="register-course"
            label="Course"
            required
            value={form.course_id}
            onChange={set("course_id")}
            error={fieldErrors.course_id}
            placeholder={form.university_id ? "Select course" : "Select university first"}
            options={catalog.courses.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectInput
            id="register-semester"
            label="Semester / Year"
            required
            value={form.semester_or_year}
            onChange={set("semester_or_year")}
            error={fieldErrors.semester_or_year}
            placeholder={form.course_id ? "Select semester" : "Select course first"}
            options={semesters.map((s) => ({ value: s, label: s }))}
          />
        </div>

        <div className="space-y-1 border-t border-brand-line pt-4">
          <Checkbox
            id="register-accept-terms"
            checked={form.accept_terms}
            onChange={set("accept_terms")}
            error={fieldErrors.accept_terms}
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
            id="register-accept-privacy"
            checked={form.accept_privacy}
            onChange={set("accept_privacy")}
            error={fieldErrors.accept_privacy}
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

        <FormAlert testId="register-error">{error}</FormAlert>

        <SubmitButton busy={busy} testId="register-submit">
          {busy ? "Creating your account…" : "Create Account"}
        </SubmitButton>

        <p className="text-center text-xs text-muted/60">
          Google sign-up is not enabled yet on this platform.
        </p>
      </motion.form>
    </AuthLayout>
  );
}
