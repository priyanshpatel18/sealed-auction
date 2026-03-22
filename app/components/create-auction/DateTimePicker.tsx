import type { ComponentProps } from "react";

const field =
  "w-full rounded-xl border border-brand-muted/50 bg-brand-bg/90 px-4 py-3 text-sm text-brand-cream transition focus:border-brand-lime focus:outline-none focus:ring-1 focus:ring-brand-lime [color-scheme:dark]";

type Props = {
  label: string;
  id: string;
  hint?: string;
  error?: string;
} & Omit<ComponentProps<"input">, "id" | "type">;

export function DateTimePicker({
  label,
  id,
  hint,
  error,
  className = "",
  ...rest
}: Props) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-brand-muted">
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        className={`${field} ${error ? "border-red-400/50" : ""} ${className}`}
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
