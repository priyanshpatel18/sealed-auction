import Image from "next/image";

export const AUCTION_ART_ALT =
  "Metallic gold ape NFT wearing a captain's hat and black shirt, red laser beams from eyes, on a pale yellow background.";

type Props = {
  /** Tailwind aspect class, e.g. aspect-[16/10] or aspect-[21/9] */
  aspectClass?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function AuctionArtImage({
  aspectClass = "aspect-[16/10]",
  priority = false,
  sizes,
  className = "",
}: Props) {
  return (
    <div
      className={`relative w-full overflow-hidden ${aspectClass} ${className}`}
    >
      <Image
        src="/auction-art.png"
        alt={AUCTION_ART_ALT}
        fill
        priority={priority}
        sizes={
          sizes ??
          "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
        }
        className="object-cover object-center"
      />
    </div>
  );
}
