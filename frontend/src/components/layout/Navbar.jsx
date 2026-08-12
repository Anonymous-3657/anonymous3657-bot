import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS } from "@/constants/navigation";
import { TESTIDS } from "@/constants/testIds";

export const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header
      data-testid={TESTIDS.navbar}
      className="sticky top-0 z-50 border-b border-brand-line bg-brand-bg/95 backdrop-blur-xl"
    >
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-link-${l.label.toLowerCase()}`}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 font-heading text-sm transition-colors duration-200 ${
                  isActive ? "bg-brand-elevated text-fg" : "text-muted hover:text-fg"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/resources"
            data-testid="nav-explore-cta"
            className="inline-flex min-h-[40px] items-center rounded-xl border border-brand-line px-4 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated"
          >
            Explore
          </Link>
          <Link
            to="/legal/about"
            data-testid="nav-about-cta"
            className="inline-flex min-h-[40px] items-center rounded-xl bg-brand-primary px-4 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
          >
            About Platform
          </Link>
        </div>

        <button
          type="button"
          data-testid={TESTIDS.navMobileToggle}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-brand-line text-fg transition-colors duration-200 hover:bg-brand-elevated lg:hidden"
        >
          {open ? <Menu className="hidden" /> : null}
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Mobile"
          data-testid="nav-mobile-panel"
          className="border-t border-brand-line bg-brand-bg lg:hidden"
        >
          <div className="container-page flex flex-col py-2">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                data-testid={`nav-mobile-link-${l.label.toLowerCase()}`}
                className="min-h-[48px] flex items-center border-b border-brand-line/60 font-heading text-sm text-fg last:border-0"
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
};
