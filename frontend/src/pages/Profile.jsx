import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import {
  FormAlert,
  PasswordField,
  SelectInput,
  SubmitButton,
  TextInput,
  inputClass,
} from "@/components/auth/FormControls";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { CollegeSelect } from "@/components/common/CollegeSelect";
import { errorMessage, useAuth } from "@/context/AuthContext";
import { api, http } from "@/services/api";
import { fmtDate } from "@/utils/format";
import { useSeo } from "@/hooks/useSeo";

const Card = ({ title, description, children }) => (
  <section className="rounded-2xl border border-brand-line bg-brand-surface p-7">
    <h2 className="font-heading text-lg font-semibold text-fg">{title}</h2>
    {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
    <div className="mt-6">{children}</div>
  </section>
);

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [catalog, setCatalog] = useState({ universities: [], colleges: [], courses: [] });
  const [profile, setProfile] = useState({
    name: user.name || "",
    bio: user.bio || "",
    phone: user.phone || "",
    university_id: user.university_id || "",
    college_code: user.college_code || "",
    course_id: user.course_id || "",
    semester_or_year: user.semester_or_year || "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState({ current_password: "", password: "", confirm_password: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");
  const [emailForm, setEmailForm] = useState({ email: "", password: "" });
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [events, setEvents] = useState([]);

  useSeo({ title: "My profile — CG STUDENT PORTAL", path: "/profile" });

  useEffect(() => {
    api.universities({ limit: 50 }).then((d) => setCatalog((c) => ({ ...c, universities: d.items })));
    http.get("/auth/audit-events").then(({ data }) => setEvents(data.items)).catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    if (!profile.university_id) return;
    Promise.all([
      api.courses({ university_id: profile.university_id, limit: 100 }),
      api.colleges({ university_id: profile.university_id, limit: 100 }),
    ]).then(([courses, colleges]) =>
      setCatalog((c) => ({ ...c, courses: courses.items, colleges: colleges.items })),
    );
  }, [profile.university_id]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        ...profile,
        college_code: profile.college_code ? Number(profile.college_code) : undefined,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwBusy(true);
    try {
      const { data } = await http.post("/auth/change-password", pw);
      toast.success(data.message);
      setPw({ current_password: "", password: "", confirm_password: "" });
    } catch (err) {
      setPwError(errorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  const saveEmail = async (e) => {
    e.preventDefault();
    setEmailError("");
    setEmailBusy(true);
    try {
      const { data } = await http.post("/auth/change-email", emailForm);
      toast.success(data.message);
      setEmailForm({ email: "", password: "" });
    } catch (err) {
      setEmailError(errorMessage(err));
    } finally {
      setEmailBusy(false);
    }
  };

  const set = (key) => (e) => setProfile((p) => ({ ...p, [key]: e.target.value }));

  return (
    <AppShell>
      <PageHeader
        title="My profile"
        description={`${user.email} · ${user.role}${user.email_verified ? " · verified" : " · unverified"}`}
        breadcrumbs={<Breadcrumbs items={[{ label: "Profile" }]} />}
      />

      <div className="container-page grid gap-6 py-12 lg:grid-cols-2" data-testid="profile-page">
        <Card title="Personal details" description="This is what other students see.">
          <form onSubmit={saveProfile} className="space-y-5" data-testid="profile-form">
            <TextInput
              id="profile-name"
              label="Full name"
              value={profile.name}
              onChange={set("name")}
              autoComplete="name"
            />
            <TextInput
              id="profile-phone"
              label="Phone"
              inputMode="numeric"
              maxLength={13}
              value={profile.phone}
              onChange={set("phone")}
              autoComplete="tel"
              hint="Changing this marks your phone unverified."
            />
            <div>
              <label htmlFor="profile-bio" className="font-heading text-sm font-medium text-fg">
                Bio
              </label>
              <textarea
                id="profile-bio"
                data-testid="profile-bio"
                rows={3}
                maxLength={400}
                value={profile.bio}
                onChange={set("bio")}
                className={`${inputClass} py-3`}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectInput
                id="profile-university"
                label="University"
                value={profile.university_id}
                onChange={set("university_id")}
                placeholder="Select university"
                options={catalog.universities.map((u) => ({ value: u.id, label: u.name }))}
              />
              <SelectInput
                id="profile-course"
                label="Course"
                value={profile.course_id}
                onChange={set("course_id")}
                placeholder="Select course"
                options={catalog.courses.map((c) => ({ value: c.id, label: c.name }))}
              />
              <TextInput
                id="profile-semester"
                label="Semester / Year"
                value={profile.semester_or_year}
                onChange={set("semester_or_year")}
              />
            </div>
            <CollegeSelect
              id="profile-college"
              required
              value={profile.college_code}
              onChange={(code) => setProfile((p) => ({ ...p, college_code: code }))}
              hint={
                user.college_name
                  ? `Current: ${user.college_name}`
                  : "Please select your college to complete your profile."
              }
            />
            <SubmitButton busy={savingProfile} testId="profile-save">
              Save changes
            </SubmitButton>
          </form>
        </Card>

        <div className="space-y-6">
          <Card title="Change password" description="Use a strong, unique password.">
            <form onSubmit={savePassword} className="space-y-5" data-testid="password-form">
              <PasswordField
                id="profile-current-password"
                label="Current password"
                autoComplete="current-password"
                required
                value={pw.current_password}
                onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
              />
              <div>
                <PasswordField
                  id="profile-new-password"
                  label="New password"
                  autoComplete="new-password"
                  required
                  value={pw.password}
                  onChange={(e) => setPw({ ...pw, password: e.target.value })}
                />
                <PasswordStrength value={pw.password} />
              </div>
              <PasswordField
                id="profile-confirm-password"
                label="Confirm new password"
                autoComplete="new-password"
                required
                value={pw.confirm_password}
                onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })}
              />
              <FormAlert testId="password-error">{pwError}</FormAlert>
              <SubmitButton busy={pwBusy} testId="password-save">
                Update password
              </SubmitButton>
            </form>
          </Card>

          <Card title="Change email" description="You will need to verify the new address.">
            <form onSubmit={saveEmail} className="space-y-5" data-testid="email-form">
              <TextInput
                id="profile-new-email"
                label="New email"
                type="email"
                inputMode="email"
                required
                value={emailForm.email}
                onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
              />
              <PasswordField
                id="profile-email-password"
                label="Confirm with your password"
                autoComplete="current-password"
                required
                value={emailForm.password}
                onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
              />
              <FormAlert testId="email-error">{emailError}</FormAlert>
              <SubmitButton busy={emailBusy} testId="email-save">
                Update email
              </SubmitButton>
            </form>
          </Card>

          <Card title="Recent account activity" description="Security events on your account.">
            {events.length === 0 ? (
              <p className="text-sm text-muted">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-3" data-testid="audit-events">
                {events.map((ev, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 text-sm">
                    <span className="capitalize text-fg/85">{ev.event.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted">{fmtDate(ev.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
