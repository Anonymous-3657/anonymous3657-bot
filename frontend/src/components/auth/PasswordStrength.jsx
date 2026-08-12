import { Check, X } from "lucide-react";

const RULES = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
  { label: "One special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const LEVELS = [
  { label: "Weak", color: "var(--brand-error)" },
  { label: "Medium", color: "var(--brand-warning)" },
  { label: "Strong", color: "var(--brand-info)" },
  { label: "Very Strong", color: "var(--brand-success)" },
];

export const passwordScore = (value) => RULES.filter((r) => r.test(value)).length;

export const PasswordStrength = ({ value = "" }) => {
  if (!value) return null;
  const passed = passwordScore(value);
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, passed - 2))];

  return (
    <div className="mt-3" data-testid="password-strength">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {LEVELS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{
                backgroundColor:
                  i < Math.max(1, passed - 1) ? level.color : "var(--brand-border)",
              }}
            />
          ))}
        </div>
        <span
          className="ml-3 font-heading text-xs"
          style={{ color: level.color }}
          data-testid="password-strength-label"
        >
          {level.label}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.label} className="flex items-center gap-2 text-xs">
              {ok ? (
                <Check className="h-3.5 w-3.5 text-brand-success" aria-hidden="true" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted/50" aria-hidden="true" />
              )}
              <span className={ok ? "text-brand-success" : "text-muted/70"}>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
