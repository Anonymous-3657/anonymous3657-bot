import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export const Breadcrumbs = ({ items = [] }) => (
  <nav aria-label="Breadcrumb" data-testid="breadcrumbs">
    <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <li>
        <Link to="/" className="transition-colors duration-200 hover:text-fg">
          Home
        </Link>
      </li>
      {items.map((item, i) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-muted/50" aria-hidden="true" />
          {item.to && i < items.length - 1 ? (
            <Link to={item.to} className="transition-colors duration-200 hover:text-fg">
              {item.label}
            </Link>
          ) : (
            <span className="text-fg/80" aria-current="page">
              {item.label}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);
