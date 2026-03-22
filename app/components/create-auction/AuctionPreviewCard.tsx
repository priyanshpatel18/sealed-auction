"use client";

import { useEffect, useState } from "react";
import { formatTimeLeft } from "@/lib/format";

export type PreviewStatus = "draft" | "upcoming" | "live" | "ended";

const badgeStyles: Record<PreviewStatus, string> = {
  draft: "border-brand-muted/50 bg-brand-muted/15 text-brand-muted",
  upcoming:
    "border-violet-400/40 bg-violet-500/15 text-violet-200 shadow-[0_0_12px_-2px_rgba(167,139,250,0.25)]",
  live: "border-brand-lime/50 bg-brand-lime/15 text-brand-lime shadow-[0_0_12px_-2px_rgba(222,241,87,0.35)]",
  ended: "border-brand-muted/60 bg-brand-muted/20 text-brand-muted",
};

const badgeLabel: Record<PreviewStatus, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  live: "Live",
  ended: "Ended",
};

type Props = {
  imageUrl: string | null;
  title: string;
  description: string;
  startingPrice: string;
  currency: string;
  /** Raw `datetime-local` values — parsed as local time (do not pass UTC ISO here). */
  startLocal: string | null;
  endLocal: string | null;
};

function deriveStatus(
  now: number,
  start: Date | null,
  end: Date | null
): PreviewStatus {
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "draft";
  }
  if (now < start.getTime()) return "upcoming";
  if (now < end.getTime()) return "live";
  return "ended";
}

export function AuctionPreviewCard({
  imageUrl,
  title,
  description,
  startingPrice,
  currency,
  startLocal,
  endLocal,
}: Props) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const start = startLocal ? new Date(startLocal) : null;
  const end = endLocal ? new Date(endLocal) : null;
  const status =
    now === null ? "draft" : deriveStatus(now, start, end);

  let remainingSec: number | null = null;
  if (now !== null && start && end) {
    if (now < start.getTime()) {
      remainingSec = Math.max(0, Math.floor((start.getTime() - now) / 1000));
    } else if (now < end.getTime()) {
      remainingSec = Math.max(0, Math.floor((end.getTime() - now) / 1000));
    } else {
      remainingSec = 0;
    }
  }

  const countdownLabel =
    status === "draft"
      ? "Set dates to preview"
      : status === "upcoming"
        ? `Starts in ${formatTimeLeft(remainingSec, false)}`
        : status === "live"
          ? `Ends in ${formatTimeLeft(remainingSec, false)}`
          : formatTimeLeft(null, true);

  const displayTitle = title.trim() || "Untitled auction";
  const displayDesc = description.trim() || "Description will appear here.";
  const priceLabel =
    startingPrice.trim() && !Number.isNaN(Number(startingPrice))
      ? `${startingPrice} ${currency}`
      : `— ${currency}`;

  return (
    <div className="glass-card feature-card flex flex-col overflow-hidden rounded-2xl border border-brand-muted/40 transition duration-300 hover:border-brand-lime/25 hover:shadow-[0_24px_48px_-28px_rgba(222,241,87,0.2)]">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-brand-muted/30 to-brand-bg">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_30%_20%,rgba(222,241,87,0.12),transparent_55%)]">
            <span className="text-xs font-medium uppercase tracking-widest text-brand-muted/60">
              Preview
            </span>
          </div>
        )}
        <div className="absolute right-3 top-3 z-10">
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${badgeStyles[status]}`}
          >
            {badgeLabel[status]}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="line-clamp-2 text-lg font-semibold text-brand-cream">
          {displayTitle}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-brand-muted leading-relaxed">
          {displayDesc}
        </p>
        <dl className="mt-4 grid gap-3 border-t border-brand-muted/30 pt-4 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-brand-muted">Starting price</dt>
            <dd className="mt-0.5 font-mono text-sm font-medium text-brand-lime">
              {priceLabel}
            </dd>
          </div>
          <div>
            <dt className="text-brand-muted">Countdown</dt>
            <dd className="mt-0.5 font-mono tabular-nums text-brand-cream">
              {now === null ? "…" : countdownLabel}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
