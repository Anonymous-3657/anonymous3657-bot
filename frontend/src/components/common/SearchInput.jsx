import { Search } from "lucide-react";

export const SearchInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Search papers, notes, subjects, courses...",
  testId = "search-input",
  submitLabel = "Search",
  submitTestId = "search-submit",
}) => (
  <form
    role="search"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit?.(value);
    }}
    className="flex w-full flex-col gap-3 rounded-2xl border border-brand-line bg-brand-surface p-2 sm:flex-row sm:items-center"
  >
    <label htmlFor={testId} className="sr-only">
      {placeholder}
    </label>
    <div className="flex min-h-[44px] flex-1 items-center gap-3 px-3">
      <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
      <input
        id={testId}
        data-testid={testId}
        type="search"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-muted sm:text-base"
      />
    </div>
    <button
      type="submit"
      data-testid={submitTestId}
      className="min-h-[44px] rounded-xl bg-brand-primary px-6 font-heading text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-primaryDark"
    >
      {submitLabel}
    </button>
  </form>
);
