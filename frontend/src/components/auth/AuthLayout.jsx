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

/** Generate a deterministic set of floating particles for the background. */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size: 2 + (i % 3),
  x: (i * 37) % 100,
  y: (i * 53) % 100,
  duration: 12 + (i % 5) * 2,
  delay: (i % 6) * 0.6,
}));

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
          {/* Drifting gradient orbs — more of them, with staggered timing */}
          <motion.div
            className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-brand-primary/25 blur-[120px]"
            animate={reduced ? {} : { x: [0, 40, -20, 0], y: [0, 30, -10, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-10 bottom-10 h-72 w-72 rounded-full bg-brand-accent2/20 blur-[130px]"
            animate={reduced ? {} : { x: [0, -30, 20, 0], y: [0, -20, 15, 0], scale: [1, 0.9, 1.1, 1] }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute left-1/3 top-1/2 h-56 w-56 rounded-full bg-brand-accent1/15 blur-[110px]"
            animate={reduced ? {} : { x: [0, 50, -30, 0], y: [0, -40, 20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />

          {/* Tiny floating particles */}
          {!reduced && PARTICLES.map((p) => (
            <motion.span
              key={p.id}
              className="absolute rounded-full bg-brand-primary/40"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
              animate={{
                y: [0, -30, 0, 20, 0],
                x: [0, 15, -10, 5, 0],
                opacity: [0.2, 0.8, 0.4, 0.9, 0.2],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: p.delay,
              }}
            />
          ))}

          {FLOATING.map((card, i) => (
            <motion.div
              key={card.label}
              className="absolute flex items-center gap-2.5 rounded-2xl border border-brand-line bg-brand-surface/80 px-4 py-3 backdrop-blur-md"
              style={{ left: card.x, top: card.y }}
              initial={reduced ? { opacity: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
              animate={
                reduced
                  ? {}
                  : { opacity: 1, y: [0, -14, 0], scale: 1 }
              }
              transition={
                reduced
                  ? {}
                  : {
                      opacity: { duration: 0.7, delay: 0.3 + i * 0.15 },
                      y: { duration: 7 + i, repeat: Infinity, ease: "easeInOut", delay: card.delay },
                      scale: { duration: 0.7, delay: 0.3 + i * 0.15, ease: [0.22, 1, 0.36, 1] },
                    }
              }
            >
              <motion.div
                animate={reduced ? {} : { rotate: [0, 8, -8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
              >
                <card.icon className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              </motion.div>
              <span className="font-heading text-xs text-fg">{card.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="relative flex h-full flex-col justify-between p-12">
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Logo withTagline />
          </motion.div>
          <motion.div
            initial={reduced ? {} : { opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md"
          >
            <h2 className="font-heading text-4xl font-bold leading-tight tracking-tight text-fg">
              One Platform.
              <br />
              <span className="text-brand-primary">Every Student.</span>
            </h2>
            <p className="mt-5 text-sm text-muted md:text-base">{BRAND.description}</p>
          </motion.div>
          <motion.p
            initial={reduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xs text-muted/70"
          >
            {BRAND.tagline}
          </motion.p>
        </div>
      </section>

      {/* Form side */}
      <section className="relative flex min-h-screen flex-col px-5 py-8 sm:px-10">
        {/* Subtle background glow behind the form on mobile */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden="true">
          <motion.div
            className="absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-primary/15 blur-[120px]"
            animate={reduced ? {} : { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="lg:hidden">
          <motion.div
            initial={reduced ? {} : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Logo />
          </motion.div>
        </div>

        <motion.div {...fade} className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <motion.div
            className="relative rounded-[20px] border border-brand-line bg-brand-surface/90 p-7 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-9"
            whileHover={reduced ? {} : { y: -2, transition: { duration: 0.3 } }}
          >
            {/* Animated gradient border — visible only when motion is enabled */}
            {!reduced && (
              <motion.div
                className="pointer-events-none absolute -inset-px rounded-[20px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(135deg, transparent 0%, transparent 100%)",
                }}
                aria-hidden="true"
              />
            )}

            <div className="relative">
              <motion.h1
                className="font-heading text-2xl font-semibold tracking-tight text-fg"
                initial={reduced ? {} : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {title}
              </motion.h1>
              {subtitle && (
                <motion.p
                  className="mt-2 text-sm text-muted"
                  initial={reduced ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {subtitle}
                </motion.p>
              )}
              <div className="mt-8">{children}</div>
            </div>
          </motion.div>
          {footer && (
            <motion.div
              className="mt-6 text-center text-sm text-muted"
              initial={reduced ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {footer}
            </motion.div>
          )}
          <motion.p
            className="mt-8 text-center text-xs text-muted/60"
            initial={reduced ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Link to="/" className="transition-colors duration-200 hover:text-fg">
              Back to CG STUDENT PORTAL
            </Link>
          </motion.p>
        </motion.div>
      </section>
    </div>
  );
};
