/** Deterministic UTC display — safe for SSR hydration. */
export function formatInstantUtc(iso: string) {
  const d = new Date(iso);
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** Compact countdown for cards (client-only display). */
export function formatTimeLeft(remainingSec: number | null, ended: boolean) {
  if (ended) return "Ended";
  if (remainingSec === null) return "…";
  if (remainingSec <= 0) return "Ended";
  const d = Math.floor(remainingSec / 86400);
  const h = Math.floor((remainingSec % 86400) / 3600);
  const m = Math.floor((remainingSec % 3600) / 60);
  const s = remainingSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}
