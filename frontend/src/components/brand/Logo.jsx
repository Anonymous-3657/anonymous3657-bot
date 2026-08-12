import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { BRAND } from "@/config/brand";
import { TESTIDS } from "@/constants/testIds";

/** Single source of truth for the brand mark. Swap BRAND.logoUrl to change everywhere. */
export const Logo = ({ withTagline = false, className = "" }) => (
  <Link
    to="/"
    data-testid={TESTIDS.navBrand}
    aria-label={`${BRAND.name} home`}
    className={`group flex items-center gap-3 ${className}`}
  >
    {BRAND.logoUrl ? (
      <img src={BRAND.logoUrl} alt={BRAND.name} className="h-9 w-auto" />
    ) : (
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-line bg-brand-primary/15 transition-colors duration-200 group-hover:bg-brand-primary/25"
        aria-hidden="true"
      >
        <GraduationCap className="h-5 w-5 text-brand-primary" strokeWidth={2} />
      </span>
    )}
    <span className="flex flex-col leading-none">
      <span className="font-heading text-[15px] font-semibold tracking-tight text-fg sm:text-base">
        CG <span className="text-brand-primary">STUDENT</span> PORTAL
      </span>
      {withTagline && (
        <span className="mt-1 text-[11px] tracking-wider text-muted">{BRAND.tagline}</span>
      )}
    </span>
  </Link>
);
