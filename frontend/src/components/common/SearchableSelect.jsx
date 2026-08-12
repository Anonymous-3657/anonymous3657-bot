import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * Searchable, district-grouped select. Options: [{ value, label, group, meta }].
 * Values are always chosen from the supplied list — free text is never accepted.
 */
export const SearchableSelect = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Search and select",
  error,
  hint,
  required,
  loading,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(term) ||
            String(o.value).includes(term) ||
            (o.meta || "").toLowerCase().includes(term),
        )
      : options;
    const map = new Map();
    filtered.slice(0, 400).forEach((o) => {
      const key = o.group || "All";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(o);
    });
    return [...map.entries()];
  }, [options, query]);

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="font-heading text-sm font-medium text-fg">
        {label}
        {required && <span className="text-brand-error"> *</span>}
      </label>

      <button
        type="button"
        id={id}
        data-testid={id}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        className={`mt-2 flex min-h-[48px] w-full items-center justify-between gap-3 rounded-xl border bg-brand-elevated px-4 text-left text-sm transition-colors duration-200 ${
          error ? "border-brand-error/60" : "border-brand-line focus:border-brand-primary"
        }`}
      >
        <span className={selected ? "line-clamp-2 text-fg" : "text-muted/60"}>
          {selected ? selected.label : loading ? "Loading colleges…" : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          data-testid={`${id}-panel`}
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-brand-line bg-brand-surface shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-brand-line px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              data-testid={`${id}-search`}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or college code…"
              className="min-h-[32px] w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="text-muted hover:text-fg"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {groups.length === 0 && (
              <li className="px-4 py-4 text-sm text-muted" data-testid={`${id}-no-results`}>
                No match found.
              </li>
            )}
            {groups.map(([group, items]) => (
              <li key={group}>
                <p className="sticky top-0 bg-brand-surface px-4 py-2 font-heading text-[11px] uppercase tracking-wider text-brand-primary">
                  {group}
                </p>
                <ul>
                  {items.map((o) => {
                    const active = String(o.value) === String(value);
                    return (
                      <li key={o.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          data-testid={`${id}-option-${o.value}`}
                          onClick={() => {
                            onChange(o.value, o);
                            setOpen(false);
                            setQuery("");
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors duration-200 ${
                            active
                              ? "bg-brand-primary/12 text-fg"
                              : "text-fg/85 hover:bg-brand-elevated"
                          }`}
                        >
                          <span className="min-w-[42px] shrink-0 font-mono text-xs text-muted">
                            {o.value}
                          </span>
                          <span className="flex-1">
                            {o.label}
                            {o.meta && (
                              <span className="mt-0.5 block text-xs text-muted/70">{o.meta}</span>
                            )}
                          </span>
                          {active && (
                            <Check className="h-4 w-4 shrink-0 text-brand-primary" aria-hidden="true" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hint && !error && <p className="mt-1.5 text-xs text-muted/70">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-brand-error">
          {error}
        </p>
      )}
    </div>
  );
};
