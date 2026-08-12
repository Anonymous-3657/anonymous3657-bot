import * as Icons from "lucide-react";
import { Link } from "react-router-dom";
import { BRAND } from "@/config/brand";
import { FOOTER_SECTIONS } from "@/constants/navigation";
import { TESTIDS } from "@/constants/testIds";
import { Logo } from "@/components/brand/Logo";

export const Footer = () => (
  <footer
    data-testid={TESTIDS.footer}
    className="mt-24 border-t border-brand-line bg-brand-surface"
  >
    <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_repeat(5,1fr)]">
      <div>
        <Logo withTagline />
        <p className="mt-5 max-w-xs text-sm text-muted">{BRAND.description}</p>
        <ul className="mt-6 flex items-center gap-3">
          {BRAND.social.map((s) => {
            const Icon = Icons[s.icon] || Icons.Link;
            return (
              <li key={s.label}>
                <a
                  href={s.href}
                  aria-label={s.label}
                  data-testid={`footer-social-${s.label.toLowerCase()}`}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:text-fg"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {FOOTER_SECTIONS.map((section) => (
        <nav key={section.title} aria-label={section.title}>
          <h2 className="font-heading text-sm font-semibold text-fg">{section.title}</h2>
          <ul className="mt-4 space-y-3">
            {section.links.map((link) => (
              <li key={link.label}>
                {link.to ? (
                  <Link
                    to={link.to}
                    data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm text-muted transition-colors duration-200 hover:text-fg"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <span className="text-sm text-muted/50">{link.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      ))}
    </div>

    <div className="border-t border-brand-line">
      <div className="container-page flex flex-col gap-2 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
        <p>Step 1 foundation — accounts, uploads and rewards arrive in later steps.</p>
      </div>
    </div>
  </footer>
);
