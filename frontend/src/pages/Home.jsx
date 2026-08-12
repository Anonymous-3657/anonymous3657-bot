import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Coins,
  FileText,
  Layers,
  Library,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { SearchInput } from "@/components/common/SearchInput";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal } from "@/components/common/Reveal";
import { CardSkeletonGrid } from "@/components/common/Skeletons";
import { EmptyState, ErrorState } from "@/components/common/StateViews";
import { ResourceCard } from "@/components/cards/ResourceCard";
import { UniversityCard } from "@/components/cards/UniversityCard";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { StatCard } from "@/components/cards/StatCard";
import { api } from "@/services/api";
import { BRAND } from "@/config/brand";
import { HOW_IT_WORKS } from "@/constants/navigation";
import { TESTIDS } from "@/constants/testIds";
import { useSeo } from "@/hooks/useSeo";

const HERO_BG =
  "https://images.unsplash.com/photo-1638864616275-9f0b291a2eb6?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzZ8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMHRlY2glMjBkYXJrfGVufDB8fHx8MTc4NjUwMzU5OXww&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [data, setData] = useState({ stats: null, categories: [], universities: [], resources: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useSeo({
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    path: "/",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, categories, universities, resources] = await Promise.all([
        api.stats(),
        api.categories({ limit: 6 }),
        api.universities({ limit: 3 }),
        api.resources({ limit: 6, sort: "recent" }),
      ]);
      setData({
        stats,
        categories: categories.items,
        universities: universities.items,
        resources: resources.items,
      });
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSearch = (value) => {
    const q = (value || "").trim();
    navigate(q ? `/resources?q=${encodeURIComponent(q)}` : "/resources");
  };

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-brand-line">
        <div className="absolute inset-0" aria-hidden="true">
          <img src={HERO_BG} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/70 via-brand-bg/90 to-brand-bg" />
          <div className="grain absolute inset-0 opacity-60" />
          <div className="animate-cg-float absolute -left-24 top-16 h-72 w-72 rounded-full bg-brand-primary/20 blur-[110px]" />
          <div className="animate-cg-float absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-brand-accent2/18 blur-[120px]" />
        </div>

        <div className="container-page relative grid gap-14 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-surface/70 px-3 py-1.5 text-xs text-muted">
                <Sparkles className="h-3.5 w-3.5 text-brand-accent" aria-hidden="true" />
                {BRAND.tagline}
              </span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-6xl">
                One Platform.
                <br />
                <span className="text-brand-primary">Every Student.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-6 max-w-xl text-base text-muted md:text-lg">{BRAND.description}</p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-9 max-w-2xl">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  onSubmit={onSearch}
                  testId={TESTIDS.heroSearchInput}
                  submitTestId={TESTIDS.heroSearchSubmit}
                />
              </div>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/resources"
                  data-testid={TESTIDS.heroPrimaryCta}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
                >
                  Explore Study Materials
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/register"
                  data-testid={TESTIDS.heroSecondaryCta}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-brand-line bg-brand-surface px-6 font-heading text-sm font-medium text-fg transition-colors duration-200 hover:bg-brand-elevated"
                >
                  Join CG STUDENT PORTAL
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted/70">
                Free to join. Browsing is open to everyone.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.2} className="hidden lg:block">
            <div className="glow-primary rounded-3xl border border-brand-line bg-brand-surface/80 p-7">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Platform snapshot</p>
              <div className="mt-6 space-y-4">
                {[
                  { icon: Building2, label: "Universities", value: data.stats?.universities },
                  { icon: Library, label: "Courses", value: data.stats?.courses },
                  { icon: BookOpen, label: "Subjects", value: data.stats?.subjects },
                  { icon: FileText, label: "Resources", value: data.stats?.resources },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-xl border border-brand-line bg-brand-elevated px-4 py-3.5"
                  >
                    <span className="inline-flex items-center gap-3 text-sm text-muted">
                      <row.icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
                      {row.label}
                    </span>
                    <span className="font-heading text-lg font-semibold text-fg">
                      {row.value ?? "—"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[11px] text-muted/70">
                Counts reflect seeded development data, not production usage.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {error && (
        <div className="container-page py-16">
          <ErrorState onRetry={load} />
        </div>
      )}

      {!error && (
        <>
          {/* Categories */}
          <section className="container-page py-20" aria-labelledby="categories-heading">
            <div id="categories-heading">
              <SectionHeading
                eyebrow="Browse by type"
                title="Popular categories"
                description="Jump straight into the kind of material you need for this semester."
                action={
                  <Link
                    to="/categories"
                    data-testid="categories-view-all"
                    className="inline-flex min-h-[44px] items-center gap-2 text-sm text-brand-primary transition-colors duration-200 hover:text-fg"
                  >
                    View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                }
              />
            </div>
            <div className="mt-10">
              {loading ? (
                <CardSkeletonGrid count={6} testId="categories-loading" />
              ) : data.categories.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.categories.map((c, i) => (
                    <Reveal key={c.id} delay={i * 0.04}>
                      <CategoryCard category={c} />
                    </Reveal>
                  ))}
                </div>
              ) : (
                <EmptyState title="No categories yet" description="Categories will appear once seeded." />
              )}
            </div>
          </section>

          {/* Featured universities */}
          <section className="container-page py-8" aria-labelledby="universities-heading">
            <div id="universities-heading">
              <SectionHeading
                eyebrow="Multi-university ready"
                title="Featured universities"
                description="Built to scale across Chhattisgarh and then all of India — every university lives in the database."
                action={
                  <Link
                    to="/universities"
                    data-testid="universities-view-all"
                    className="inline-flex min-h-[44px] items-center gap-2 text-sm text-brand-primary transition-colors duration-200 hover:text-fg"
                  >
                    All universities <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                }
              />
            </div>
            <div className="mt-10">
              {loading ? (
                <CardSkeletonGrid count={3} testId="universities-loading" />
              ) : data.universities.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.universities.map((u, i) => (
                    <Reveal key={u.id} delay={i * 0.05}>
                      <UniversityCard university={u} />
                    </Reveal>
                  ))}
                </div>
              ) : (
                <EmptyState title="No universities yet" />
              )}
            </div>
          </section>

          {/* Latest resources */}
          <section className="container-page py-20" aria-labelledby="resources-heading">
            <div id="resources-heading">
              <SectionHeading
                eyebrow="Fresh on the portal"
                title="Latest study resources"
                description="Question papers, notes and syllabus records seeded for development."
                action={
                  <Link
                    to="/resources"
                    data-testid="resources-view-all"
                    className="inline-flex min-h-[44px] items-center gap-2 text-sm text-brand-primary transition-colors duration-200 hover:text-fg"
                  >
                    Browse all <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                }
              />
            </div>
            <div className="mt-10">
              {loading ? (
                <CardSkeletonGrid count={6} testId="resources-loading" />
              ) : data.resources.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.resources.map((r, i) => (
                    <Reveal key={r.id} delay={i * 0.04}>
                      <ResourceCard resource={r} />
                    </Reveal>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No study materials found yet"
                  description="Uploads open in Step 4 of the roadmap."
                />
              )}
            </div>
          </section>

          {/* Stats */}
          <section className="border-y border-brand-line bg-brand-surface/40 py-16" aria-labelledby="stats-heading">
            <div className="container-page">
              <h2 id="stats-heading" className="font-heading text-2xl font-semibold tracking-tight text-fg">
                Catalog at a glance
              </h2>
              <p className="mt-2 text-sm text-muted">
                Live counts from the development database — clearly demo data, not production metrics.
              </p>
              <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Universities" value={data.stats?.universities ?? 0} icon={Building2} />
                <StatCard label="Courses" value={data.stats?.courses ?? 0} icon={Library} />
                <StatCard label="Subjects" value={data.stats?.subjects ?? 0} icon={BookOpen} />
                <StatCard label="Resources" value={data.stats?.resources ?? 0} icon={FileText} />
              </div>
            </div>
          </section>
        </>
      )}

      {/* How it works */}
      <section id="how-it-works" className="container-page py-20" aria-labelledby="how-heading">
        <div id="how-heading">
          <SectionHeading eyebrow="How it works" title="Three steps to your study material" />
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => {
            const icons = { Search: Layers, BookOpen, TrendingUp: Coins };
            const Icon = icons[step.icon] || Layers;
            return (
              <Reveal key={step.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-brand-line bg-brand-surface p-7">
                  <span className="font-heading text-xs tracking-[0.2em] text-brand-primary">
                    STEP {i + 1}
                  </span>
                  <Icon className="mt-5 h-6 w-6 text-brand-accent2" aria-hidden="true" />
                  <h3 className="mt-4 font-heading text-lg font-semibold text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted">{step.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Earning + Premium previews */}
      <section className="container-page grid gap-5 pb-20 lg:grid-cols-2" aria-label="Upcoming modules">
        <Reveal>
          <div className="h-full rounded-2xl border border-brand-line bg-brand-surface p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-accent/40 bg-brand-accent/10 px-3 py-1 text-[11px] font-medium text-brand-accent">
              <Coins className="h-3.5 w-3.5" aria-hidden="true" /> Planned for Step 6
            </span>
            <h3 className="mt-5 font-heading text-xl font-semibold text-fg">Study, earn, grow</h3>
            <p className="mt-3 text-sm text-muted">
              Contributors will earn coins for approved uploads and redeem them for rewards. The wallet
              is intentionally not live yet — no balances or transactions exist today.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-2xl border border-brand-line bg-brand-surface p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-accent2/40 bg-brand-accent2/10 px-3 py-1 text-[11px] font-medium text-brand-accent2">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Planned for Steps 7 & 9
            </span>
            <h3 className="mt-5 font-heading text-xl font-semibold text-fg">Premium & AI study tools</h3>
            <p className="mt-3 text-sm text-muted">
              Premium plans and AI-assisted revision are on the roadmap. No payment provider is wired up
              in this build.
            </p>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="container-page pb-24" aria-labelledby="cta-heading">
        <div className="relative overflow-hidden rounded-3xl border border-brand-line bg-brand-surface px-8 py-14 lg:px-14">
          <div className="grain absolute inset-0 opacity-50" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <h2 id="cta-heading" className="font-heading text-3xl font-bold tracking-tight text-fg sm:text-4xl">
              Start with your subject.
            </h2>
            <p className="mt-4 text-sm text-muted md:text-base">
              Search the catalog, open your course and find every paper mapped to your semester.
            </p>
            <Link
              to="/resources"
              data-testid="footer-cta-button"
              className="mt-8 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-brand-primary px-6 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
            >
              Explore Study Materials
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
