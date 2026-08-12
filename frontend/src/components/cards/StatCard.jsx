import { Counter } from "@/components/common/Counter";

export const StatCard = ({ label, value, icon: Icon, suffix = "" }) => (
  <div
    data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
    className="rounded-2xl border border-brand-line bg-brand-surface p-6 transition-colors duration-200 hover:bg-brand-elevated"
  >
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      {Icon && <Icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />}
    </div>
    <p className="mt-4 font-heading text-3xl font-bold tracking-tight text-fg">
      <Counter value={value} suffix={suffix} />
    </p>
  </div>
);
