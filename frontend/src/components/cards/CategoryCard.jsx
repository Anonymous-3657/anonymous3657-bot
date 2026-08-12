import * as Icons from "lucide-react";
import { Link } from "react-router-dom";

export const CategoryCard = ({ category }) => {
  const Icon = Icons[category.icon] || Icons.Folder;
  return (
    <Link
      to={`/resources?category_id=${category.id}`}
      data-testid={`category-card-${category.slug}`}
      className="group flex items-center gap-4 rounded-2xl border border-brand-line bg-brand-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-brand-primary/50"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-primary/12">
        <Icon className="h-5 w-5 text-brand-primary" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-heading text-sm font-medium text-fg">{category.name}</span>
        {category.description && (
          <span className="mt-0.5 block truncate text-xs text-muted">{category.description}</span>
        )}
      </span>
    </Link>
  );
};
