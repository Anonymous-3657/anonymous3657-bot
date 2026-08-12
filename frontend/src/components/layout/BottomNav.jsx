import * as Icons from "lucide-react";
import { NavLink } from "react-router-dom";
import { MOBILE_NAV } from "@/constants/navigation";
import { TESTIDS } from "@/constants/testIds";

export const BottomNav = () => (
  <nav
    aria-label="Mobile navigation"
    data-testid={TESTIDS.bottomNav}
    className="fixed bottom-0 left-0 right-0 z-50 border-t border-brand-line bg-brand-bg/98 backdrop-blur-xl lg:hidden"
  >
    <ul className="grid grid-cols-5">
      {MOBILE_NAV.map((item) => {
        const Icon = Icons[item.icon] || Icons.Circle;
        const testId = `bottom-nav-${item.label.toLowerCase()}`;
        if (!item.enabled) {
          return (
            <li key={item.label}>
              <span
                data-testid={testId}
                aria-disabled="true"
                title="Coming in a later step"
                className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] text-muted/40"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </span>
            </li>
          );
        }
        return (
          <li key={item.label}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              data-testid={testId}
              className={({ isActive }) =>
                `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-200 ${
                  isActive ? "text-brand-primary" : "text-muted"
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          </li>
        );
      })}
    </ul>
  </nav>
);
