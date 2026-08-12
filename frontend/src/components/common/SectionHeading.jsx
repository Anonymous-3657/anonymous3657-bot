export const SectionHeading = ({ eyebrow, title, description, action, align = "left" }) => (
  <div
    className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${
      align === "center" ? "text-center md:text-left" : ""
    }`}
  >
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-brand-primary">{eyebrow}</p>
      )}
      <h2 className="font-heading text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        {title}
      </h2>
      {description && <p className="mt-3 text-sm text-muted md:text-base">{description}</p>}
    </div>
    {action}
  </div>
);
