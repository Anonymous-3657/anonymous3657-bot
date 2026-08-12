export const PageHeader = ({ title, description, breadcrumbs, right }) => (
  <section className="border-b border-brand-line bg-brand-surface/40">
    <div className="container-page py-12 lg:py-16">
      {breadcrumbs}
      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {title}
          </h1>
          {description && <p className="mt-3 text-sm text-muted md:text-base">{description}</p>}
        </div>
        {right}
      </div>
    </div>
  </section>
);
