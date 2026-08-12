import { ArrowUpRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { DemoBadge } from "@/components/common/DemoBadge";

export const UniversityCard = ({ university }) => (
  <Link
    to={`/universities/${university.slug}`}
    data-testid={`university-card-${university.slug}`}
    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-line bg-brand-surface transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-brand-primary/50"
  >
    <div className="relative h-36 w-full overflow-hidden bg-brand-elevated">
      {university.banner_url ? (
        <img
          src={university.banner_url}
          alt={`${university.name} campus`}
          loading="lazy"
          className="h-full w-full object-cover opacity-70 transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="grain h-full w-full" aria-hidden="true" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-surface to-transparent" />
    </div>
    <div className="flex flex-1 flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-fg">{university.name}</h3>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-colors duration-200 group-hover:text-brand-primary" aria-hidden="true" />
      </div>
      {university.short_name && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          {university.short_name}
        </p>
      )}
      {university.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted">{university.description}</p>
      )}
      {university.is_demo && <DemoBadge className="mt-4 self-start" />}
    </div>
  </Link>
);
