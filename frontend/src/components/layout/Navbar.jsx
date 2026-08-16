import { useState } from "react";
import { Bookmark, LayoutDashboard, LogOut, Menu, Moon, Sparkles, Sun, User, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { NAV_LINKS } from "@/constants/navigation";
import { TESTIDS } from "@/constants/testIds";
import { useAuth } from "@/context/AuthContext";

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/", { replace: true });
  };

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
          <button
            type="button"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:text-fg"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user ? (
            <>
              <Link
                to="/study-buddy"
                data-testid="nav-study-buddy-link"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-brand-line px-4 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated"
              >
                <Sparkles className="h-4 w-4 text-brand-accent" aria-hidden="true" />
                Study AI
              </Link>
              <Link
                to="/bookmarks"
                data-testid="nav-bookmarks-link"
                aria-label="My shelf"
                className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:text-fg"
              >
                <Bookmark className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/dashboard"
                data-testid="nav-dashboard-link"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-brand-line px-4 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
              <Link
                to="/profile"
                data-testid="nav-profile-link"
                aria-label="My profile"
                className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:text-fg"
              >
                <User className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={onLogout}
                data-testid="nav-logout-button"
                aria-label="Sign out"
                className="grid h-10 w-10 place-items-center rounded-xl border border-brand-line text-muted transition-colors duration-200 hover:text-fg"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-login-link"
                className="inline-flex min-h-[40px] items-center rounded-xl border border-brand-line px-4 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                data-testid="nav-register-link"
                className="inline-flex min-h-[40px] items-center rounded-xl bg-brand-primary px-4 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
              >
                Create Account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          data-testid={TESTIDS.navMobileToggle}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-xl border border-brand-line text-fg transition-colors duration-200 hover:bg-brand-elevated lg:hidden"
        >
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
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="mb-2 flex min-h-[48px] items-center justify-between border-b border-brand-line/60 font-heading text-sm text-fg"
            >
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                data-testid={`nav-mobile-link-${l.label.toLowerCase()}`}
                className="flex min-h-[48px] items-center border-b border-brand-line/60 font-heading text-sm text-fg"
              >
                {l.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  data-testid="nav-mobile-dashboard"
                  className="flex min-h-[48px] items-center border-b border-brand-line/60 font-heading text-sm text-fg"
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/study-buddy"
                  onClick={() => setOpen(false)}
                  data-testid="nav-mobile-study-buddy"
                  className="flex min-h-[48px] items-center border-b border-brand-line/60 font-heading text-sm text-fg"
                >
                  AI Study Buddy
                </NavLink>
                <NavLink
                  to="/bookmarks"
                  onClick={() => setOpen(false)}
                  data-testid="nav-mobile-bookmarks"
                  className="flex min-h-[48px] items-center border-b border-brand-line/60 font-heading text-sm text-fg"
                >
                  My shelf
                </NavLink>
                <NavLink
                  to="/profile"
                  onClick={() => setOpen(false)}
                  data-testid="nav-mobile-profile"
                  className="flex min-h-[48px] items-center border-b border-brand-line/60 font-heading text-sm text-fg"
                >
                  My profile
                </NavLink>
                <button
                  type="button"
                  onClick={onLogout}
                  data-testid="nav-mobile-logout"
                  className="flex min-h-[48px] items-center font-heading text-sm text-brand-error"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  data-testid="nav-mobile-login"
                  className="flex min-h-[48px] items-center border-b border-brand-line/60 font-heading text-sm text-fg"
                >
                  Sign In
                </NavLink>
                <NavLink
                  to="/register"
                  onClick={() => setOpen(false)}
                  data-testid="nav-mobile-register"
                  className="flex min-h-[48px] items-center font-heading text-sm text-brand-primary"
                >
                  Create Account
                </NavLink>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};
