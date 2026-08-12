import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const FormField = ({ id, label, hint, error, children, className = "" }) => (
  <div className={className}>
    <label htmlFor={id} className="font-heading text-sm font-medium text-fg">
      {label}
    </label>
    {children}
    {hint && !error && <p className="mt-1.5 text-xs text-muted/70">{hint}</p>}
    {error && (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-brand-error">
        {error}
      </p>
    )}
  </div>
);

export const inputClass =
  "mt-2 min-h-[48px] w-full rounded-xl border border-brand-line bg-brand-elevated px-4 text-sm text-fg outline-none transition-colors duration-200 placeholder:text-muted/60 focus:border-brand-primary";

export const TextInput = ({ id, label, error, hint, className, ...props }) => (
  <FormField id={id} label={label} error={error} hint={hint} className={className}>
    <input
      id={id}
      data-testid={id}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={inputClass}
      {...props}
    />
  </FormField>
);

export const PasswordField = ({ id, label, error, hint, className, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <FormField id={id} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <input
          id={id}
          data-testid={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${inputClass} pr-14`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          data-testid={`${id}-toggle`}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors duration-200 hover:text-fg"
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </FormField>
  );
};

export const SelectInput = ({ id, label, error, hint, options, placeholder, className, ...props }) => (
  <FormField id={id} label={label} error={error} hint={hint} className={className}>
    <select
      id={id}
      data-testid={id}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={inputClass}
      {...props}
    >
      <option value="">{placeholder || "Select"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </FormField>
);

export const Checkbox = ({ id, label, checked, onChange, error }) => (
  <div>
    <label
      htmlFor={id}
      className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-muted"
    >
      <input
        id={id}
        data-testid={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--brand-primary)]"
      />
      <span>{label}</span>
    </label>
    {error && (
      <p role="alert" className="text-xs text-brand-error">
        {error}
      </p>
    )}
  </div>
);

export const SubmitButton = ({ busy, children, testId, disabled }) => (
  <button
    type="submit"
    disabled={busy || disabled}
    data-testid={testId}
    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-primary font-heading text-sm font-medium text-white transition-[background-color,transform] duration-200 hover:bg-brand-primaryDark active:scale-[0.99] disabled:opacity-60"
  >
    {busy && (
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        aria-hidden="true"
      />
    )}
    {children}
  </button>
);

export const FormAlert = ({ tone = "error", children, testId }) => {
  if (!children) return null;
  const styles = {
    error: "border-brand-error/40 bg-brand-error/10 text-brand-error",
    success: "border-brand-success/40 bg-brand-success/10 text-brand-success",
    info: "border-brand-info/40 bg-brand-info/10 text-brand-info",
  }[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      data-testid={testId}
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </p>
  );
};
