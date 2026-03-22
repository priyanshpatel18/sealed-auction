import type { ComponentProps } from "react";

const field =
  "w-full cursor-pointer appearance-none rounded-xl border border-brand-muted/50 bg-brand-bg/90 px-4 py-3 text-sm text-brand-cream transition focus:border-brand-lime focus:outline-none focus:ring-1 focus:ring-brand-lime";

type Option = { value: string; label: string };

type Props = {
  label: string;
  id: string;
  options: Option[];
  hint?: string;
  error?: string;
} & Omit<ComponentProps<"select">, "id" | "children">;

export function Select({ label, id, options, hint, error, className = "", ...rest }: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-brand-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          className={`${field} ${error ? "border-red-400/50" : ""} pr-10 ${className}`}
          aria-invalid={!!error}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted">
          ▼
        </span>
      </div>
      {hint && !error ? (
        <p className="text-xs text-brand-muted/80">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-red-300/90">{error}</p> : null}
    </div>
  );
}
