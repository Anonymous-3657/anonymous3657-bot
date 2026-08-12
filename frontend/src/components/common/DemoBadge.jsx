import { FlaskConical } from "lucide-react";
import { DEMO_DATA_NOTICE } from "@/config/brand";

export const DemoBadge = ({ className = "" }) => (
  <span
    data-testid="demo-data-badge"
    title={DEMO_DATA_NOTICE}
    className={`inline-flex items-center gap-1.5 rounded-full border border-brand-warning/40 bg-brand-warning/10 px-2.5 py-1 text-[11px] font-medium text-brand-warning ${className}`}
  >
    <FlaskConical className="h-3 w-3" aria-hidden="true" />
    Demo data
  </span>
);
