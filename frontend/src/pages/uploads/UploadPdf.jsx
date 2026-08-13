import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { FormAlert, SubmitButton, TextInput, inputClass } from "@/components/auth/FormControls";
import { errorMessage, useAuth } from "@/context/AuthContext";
import { pdfApi } from "@/services/api";
import { useSeo } from "@/hooks/useSeo";

const MAX_BYTES = 25 * 1024 * 1024;

export default function UploadPdf() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: "", subject: "", semester: "", session: "", description: "" });
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useSeo({ title: "Upload study material — CG STUDENT PORTAL", path: "/dashboard/uploads/new" });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickFile = (e) => {
    const picked = e.target.files?.[0];
    setError("");
    if (!picked) return setFile(null);
    const allowed = /\.(pdf|docx?|pptx?|xlsx?|csv|txt|md|jpe?g|png|gif|webp|svg|mp4|webm|ogg|mov|avi|mkv)$/i;
    if (!picked.name || !allowed.test(picked.name)) {
      setFile(null);
      setError("Only documents, images, and videos are supported.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFile(null);
      setError("File must be 100 MB or smaller.");
      return;
    }
    setFile(picked);
    if (!form.title) setForm((f) => ({ ...f, title: picked.name.replace(/\.[^.]+$/i, "") }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!file) return setError("Choose a PDF file to upload.");
    if (form.title.trim().length < 3) return setError("Give your document a clear title.");
    if (!form.subject.trim() || !form.semester.trim())
      return setError("Subject and semester are required.");

    const data = new FormData();
    data.append("file", file);
    data.append("title", form.title.trim());
    data.append("subject", form.subject.trim());
    data.append("semester", form.semester.trim());
    if (form.session.trim()) data.append("session", form.session.trim());
    if (form.description.trim()) data.append("description", form.description.trim());

    setBusy(true);
    setProgress(0);
    try {
      await pdfApi.upload(data, setProgress);
      toast.success("Uploaded — an admin will review it shortly");
      navigate("/dashboard/uploads", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Upload study material"
        description="Share a PDF with your juniors. An admin reviews every upload before it goes live."
        breadcrumbs={
          <Breadcrumbs
            items={[{ label: "Dashboard", to: "/dashboard" }, { label: "Upload" }]}
          />
        }
      />

      <div className="container-page max-w-3xl py-12" data-testid="upload-pdf-page">
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-brand-info/40 bg-brand-info/10 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-info" aria-hidden="true" />
          <p className="text-sm text-fg/85">
            Upload only material you have the right to share. Your file stays private until an
            admin approves it — you cannot publish it yourself.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6" data-testid="upload-pdf-form">
          <div>
            <label htmlFor="upload-file" className="font-heading text-sm font-medium text-fg">
              File or media upload <span className="text-brand-error">*</span>
            </label>
            <label
              htmlFor="upload-file"
              className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand-line bg-brand-surface/50 px-6 py-10 text-center transition-colors duration-200 hover:border-brand-primary/60"
            >
              <FileUp className="h-7 w-7 text-brand-primary" aria-hidden="true" />
              <span className="font-heading text-sm text-fg">
                {file ? file.name : "Tap to choose a file"}
              </span>
              <span className="text-xs text-muted">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                  : "Documents, images, and videos · up to 100 MB"}
              </span>
            </label>
            <input
              id="upload-file"
              data-testid="upload-file-input"
              type="file"
              accept="application/pdf,.pdf,application/msword,.doc,.docx,application/vnd.ms-powerpoint,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx,application/vnd.ms-excel,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,text/plain,.txt,text/markdown,.md,image/*,video/*"
              onChange={pickFile}
              className="sr-only"
            />
          </div>

          <TextInput
            id="upload-title"
            label="Document title"
            required
            value={form.title}
            onChange={set("title")}
            placeholder="DBMS Unit 2 — handwritten notes"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              id="upload-subject"
              label="Subject"
              required
              value={form.subject}
              onChange={set("subject")}
              placeholder="Database Management Systems"
            />
            <TextInput
              id="upload-semester"
              label="Semester / Year"
              required
              value={form.semester}
              onChange={set("semester")}
              placeholder="Semester 3"
            />
            <TextInput
              id="upload-session"
              label="Session (optional)"
              value={form.session}
              onChange={set("session")}
              placeholder="2025-26"
            />
            <TextInput
              id="upload-college"
              label="College"
              value={user.college_name || "Complete your profile to set this"}
              readOnly
              disabled
            />
          </div>

          <div>
            <label htmlFor="upload-description" className="font-heading text-sm font-medium text-fg">
              Description (optional)
            </label>
            <textarea
              id="upload-description"
              data-testid="upload-description"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={set("description")}
              className={`${inputClass} py-3`}
            />
          </div>

          {busy && (
            <div data-testid="upload-progress">
              <div className="h-2 w-full overflow-hidden rounded-full bg-brand-elevated">
                <div
                  className="h-full rounded-full bg-brand-primary transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {progress < 100 ? `Uploading ${progress}%` : "Finishing up…"}
              </p>
            </div>
          )}

          <FormAlert testId="upload-error">{error}</FormAlert>

          <SubmitButton busy={busy} testId="upload-submit">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {busy ? "Uploading…" : "Upload for review"}
          </SubmitButton>
        </form>
      </div>
    </AppShell>
  );
}
