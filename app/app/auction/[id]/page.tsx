import { AuctionArtImage } from "@/components/AuctionArtImage";
import { AuctionDetailClient } from "@/components/auction/AuctionDetailClient";
import { getListingById } from "@/lib/data";
import { formatInstantUtc } from "@/lib/format";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge, StatusBadge } from "@/components/ui/Badge";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = getListingById(id);
  if (!listing) return { title: "Auction" };
  return {
    title: `${listing.title} · Sealed-bid auction`,
    description: listing.shortDescription,
  };
}

export default async function AuctionPage({ params }: Props) {
  const { id } = await params;
  const listing = getListingById(id);
  if (!listing) notFound();

  return (
    <article className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/discover"
        className="text-sm font-medium text-brand-muted transition hover:text-brand-lime focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
      >
        ← Discover
      </Link>

      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge label={listing.category} />
          <StatusBadge status={listing.status} />
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-cream sm:text-4xl">
          {listing.title}
        </h1>
        <p className="mt-2 text-brand-muted">
          {listing.sellerLabel}{" "}
          <span className="font-mono text-xs text-brand-muted/80">
            {listing.sellerWalletShort}
          </span>
        </p>
      </header>

      <div className="relative mt-10 overflow-hidden rounded-2xl border border-brand-muted/40">
        <AuctionArtImage
          aspectClass="aspect-[21/9]"
          priority
          sizes="(max-width: 896px) 100vw, 896px"
        />
      </div>

      <div className="mt-10 max-w-none">
        <p className="text-base leading-relaxed text-brand-muted">
          {listing.description}
        </p>
        <p className="mt-4 text-xs text-brand-muted/80">
          Window (UTC): {formatInstantUtc(listing.startAt)} →{" "}
          {formatInstantUtc(listing.endAt)}
        </p>
      </div>

      <div className="mt-12">
        <AuctionDetailClient listing={listing} />
      </div>
    </article>
  );
}
