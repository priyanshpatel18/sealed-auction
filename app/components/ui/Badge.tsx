import type { AuctionStatus } from "@/lib/data";

const styles: Record<AuctionStatus | "default", string> = {
  live: "border-brand-lime/50 bg-brand-lime/15 text-brand-lime shadow-[0_0_12px_-2px_rgba(222,241,87,0.35)]",
  ending_soon:
    "border-amber-400/40 bg-amber-500/10 text-amber-200 shadow-[0_0_12px_-2px_rgba(251,191,36,0.2)]",
  ended: "border-brand-muted/60 bg-brand-muted/20 text-brand-muted",
  default: "border-brand-muted/50 bg-brand-cream/5 text-brand-cream",
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: AuctionStatus;
  className?: string;
}) {
  const label =
    status === "live"
      ? "Live"
      : status === "ending_soon"
        ? "Ending soon"
        : "Ended";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${styles[status]} ${className}`}
    >
      {label}
    </span>
  );
}

export function CategoryBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-md border border-brand-muted/50 bg-brand-bg/80 px-2 py-0.5 text-xs font-medium text-brand-cream backdrop-blur-sm ${className}`}
    >
      {label}
    </span>
  );
}
