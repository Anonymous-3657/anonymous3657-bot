import { useState } from "react";
import * as Icons from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/brand/Logo";
import { ADMIN_NAV } from "@/constants/adminEntities";
import { useAuth } from "@/context/AuthContext";

export const AdminLayout = ({ title, description, actions, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 z-50 border-b border-brand-line bg-brand-bg/95 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              data-testid="admin-sidebar-toggle"
              aria-label="Toggle admin menu"
              aria-expanded={open}
              className="grid h-11 w-11 place-items-center rounded-xl border border-brand-line text-fg lg:hidden"
            >
              <Icons.Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <Logo />
            <span className="hidden rounded-full border border-brand-primary/40 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-medium text-brand-primary sm:inline">
              Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span data-testid="admin-current-user" className="hidden text-xs text-muted sm:block">
              {user?.email} · {user?.role}
            </span>
            <button
              type="button"
              onClick={onLogout}
              data-testid="admin-logout-button"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-brand-line px-4 font-heading text-sm text-fg transition-colors duration-200 hover:bg-brand-elevated"
            >
              <Icons.LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[236px_1fr]">
        <aside
          data-testid="admin-sidebar"
          className={`${open ? "block" : "hidden"} lg:block`}
        >
          <nav aria-label="Admin sections" className="space-y-1.5">
            {ADMIN_NAV.map((item) => {
              const Icon = Icons[item.icon] || Icons.Circle;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  onClick={() => setOpen(false)}
                  data-testid={`admin-nav-${item.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center gap-3 rounded-xl px-4 font-heading text-sm transition-colors duration-200 ${
                      isActive
                        ? "bg-brand-primary/12 text-fg"
                        : "text-muted hover:bg-brand-elevated hover:text-fg"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
            <NavLink
              to="/"
              className="mt-4 flex min-h-[44px] items-center gap-3 rounded-xl px-4 font-heading text-sm text-muted transition-colors duration-200 hover:text-fg"
            >
              <Icons.ExternalLink className="h-4 w-4" aria-hidden="true" />
              View public site
            </NavLink>
          </nav>
        </aside>

        <main>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-fg">{title}</h1>
              {description && <p className="mt-2 text-sm text-muted">{description}</p>}
            </div>
            {actions}
          </div>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
};
