import { motion } from "framer-motion";
import { BookOpen, FileText, GraduationCap, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/config/brand";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const FLOATING = [
  { icon: FileText, label: "Question Papers", x: "6%", y: "18%", delay: 0 },
  { icon: BookOpen, label: "Semester Notes", x: "58%", y: "8%", delay: 0.15 },
  { icon: GraduationCap, label: "Course Syllabus", x: "20%", y: "62%", delay: 0.3 },
  { icon: ShieldCheck, label: "Verified Uploads", x: "62%", y: "70%", delay: 0.45 },
];

/** Split-screen shell shared by every authentication screen. */
export const AuthLayout = ({ title, subtitle, children, footer, testId = "auth-layout" }) => {
  const reduced = usePrefersReducedMotion();
  const fade = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <div className="min-h-screen bg-brand-bg lg:grid lg:grid-cols-[1.05fr_1fr]" data-testid={testId}>
      {/* Brand side */}
      <section className="relative hidden overflow-hidden border-r border-brand-line lg:block">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="grain absolute inset-0 opacity-60" />
          <div className="animate-cg-float absolute -left-20 top-24 h-72 w-72 rounded-full bg-brand-primary/20 blur-[120px]" />
          <div className="animate-cg-float absolute -right-10 bottom-10 h-72 w-72 rounded-full bg-brand-accent2/18 blur-[130px]" />
          {FLOATING.map((card) => (
            <motion.div
              key={card.label}
              className="absolute flex items-center gap-2.5 rounded-2xl border border-brand-line bg-brand-surface/80 px-4 py-3 backdrop-blur-md"
              style={{ left: card.x, top: card.y }}
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={
                reduced
                  ? {}
                  : { opacity: 1, y: [0, -12, 0] }
              }
              transition={
                reduced
                  ? {}
                  : {
                      opacity: { duration: 0.6, delay: card.delay },
                      y: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: card.delay },
                    }
              }
            >
              <card.icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <span className="font-heading text-xs text-fg">{card.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo withTagline />
          <div className="max-w-md">
            <h2 className="font-heading text-4xl font-bold leading-tight tracking-tight text-fg">
              One Platform.
              <br />
              <span className="text-brand-primary">Every Student.</span>
            </h2>
            <p className="mt-5 text-sm text-muted md:text-base">{BRAND.description}</p>
          </div>
          <p className="text-xs text-muted/70">{BRAND.tagline}</p>
        </div>
      </section>

      {/* Form side */}
      <section className="flex min-h-screen flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>

        <motion.div {...fade} className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="rounded-[20px] border border-brand-line bg-brand-surface/90 p-7 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-9">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          <p className="mt-8 text-center text-xs text-muted/60">
            <Link to="/" className="transition-colors duration-200 hover:text-fg">
              Back to CG STUDENT PORTAL
            </Link>
          </p>
        </motion.div>
      </section>
    </div>
  );
};
