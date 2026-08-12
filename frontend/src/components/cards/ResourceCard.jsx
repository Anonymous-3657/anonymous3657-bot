import { BadgeCheck, Crown, Download, Eye, FileText } from "lucide-react";
import { BookmarkButton } from "@/components/resources/BookmarkButton";
import { fmtBytes, fmtDate, fmtNumber } from "@/utils/format";

const Meta = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    {children}
  </span>
);

export const ResourceCard = ({ resource, testId }) => (
  <article
    data-testid={testId || `resource-card-${resource.slug}`}
    className="group flex h-full flex-col rounded-2xl border border-brand-line bg-brand-surface p-6 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-brand-primary/50 hover:bg-brand-elevated"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="inline-flex items-center gap-2 rounded-lg border border-brand-line bg-brand-elevated px-2.5 py-1 text-[11px] uppercase tracking-wider text-muted">
        <FileText className="h-3.5 w-3.5 text-brand-info" aria-hidden="true" />
        {resource.file_type || "file"}
      </span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {resource.is_verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-success/12 px-2 py-1 text-[11px] font-medium text-brand-success">
            <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Verified
          </span>
        )}
        {resource.is_premium && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-accent/12 px-2 py-1 text-[11px] font-medium text-brand-accent">
            <Crown className="h-3 w-3" aria-hidden="true" /> Premium
          </span>
        )}
      </div>
    </div>

    <h3 className="mt-5 font-heading text-base font-semibold leading-snug text-fg">
      {resource.title}
    </h3>

    <dl className="mt-4 space-y-1.5 text-xs text-muted">
      {resource.subject && (
        <div className="flex gap-2">
          <dt className="text-muted/70">Subject</dt>
          <dd className="text-fg/80">{resource.subject}</dd>
        </div>
      )}
      {resource.course && (
        <div className="flex gap-2">
          <dt className="text-muted/70">Course</dt>
          <dd className="text-fg/80">{resource.course}</dd>
        </div>
      )}
      {resource.university && (
        <div className="flex gap-2">
          <dt className="text-muted/70">University</dt>
          <dd className="text-fg/80">{resource.university}</dd>
        </div>
      )}
      {resource.year && (
        <div className="flex gap-2">
          <dt className="text-muted/70">Year</dt>
          <dd className="text-fg/80">{resource.year}</dd>
        </div>
      )}
    </dl>

    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-brand-line pt-4">
      <Meta icon={Download}>{fmtNumber(resource.downloads)}</Meta>
      <Meta icon={Eye}>{fmtNumber(resource.views)}</Meta>
      <span className="text-xs text-muted/70">{fmtBytes(resource.file_size)}</span>
      <span className="ml-auto text-xs text-muted/70">{fmtDate(resource.created_at)}</span>
    </div>

    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-xs text-muted/70">
        {resource.category || "Study material"}
      </span>
      <BookmarkButton resourceId={resource.id} />
    </div>
  </article>
);
