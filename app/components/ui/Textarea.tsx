import type { ComponentProps } from "react";

const field =
  "min-h-[120px] w-full resize-y rounded-xl border border-brand-muted/50 bg-brand-bg/90 px-4 py-3 text-sm text-brand-cream placeholder:text-brand-muted/45 transition focus:border-brand-lime focus:outline-none focus:ring-1 focus:ring-brand-lime";

type Props = {
  label: string;
  hint?: string;
  error?: string;
  id: string;
} & Omit<ComponentProps<"textarea">, "id">;

export function Textarea({
  label,
  hint,
  error,
  id,
  className = "",
  ...rest
}: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-brand-muted">
        {label}
      </label>
      <textarea
        id={id}
        className={`${field} ${error ? "border-red-400/50 focus:border-red-400 focus:ring-red-400/40" : ""} ${className}`}
        aria-invalid={!!error}
        {...rest}
      />
      {hint && !error ? (
        <p className="text-xs text-brand-muted/80">{hint}</p>
      ) : null}
      {error ? <p className="text-xs text-red-300/90">{error}</p> : null}
    </div>
  );
}
