import { CreateAuctionCta } from "@/components/landing/CreateAuctionCta";
import { FeaturesScrollSection } from "@/components/landing/FeaturesScrollSection";

const features = [
  {
    title: "Encrypted Bids",
    body: "All bids remain private until the auction closes — no visible order book.",
  },
  {
    title: "TEE Execution",
    body: "Winner computed securely in a trusted environment with zero bid leakage.",
  },
  {
    title: "On-chain Commitment",
    body: "Verifiable, tamper-proof results committed to chain for anyone to audit.",
  },
  {
    title: "No Middlemen",
    body: "Fully trustless flow — no centralized auction house or relayer required.",
  },
];

export function LandingPage() {
  return (
    <div className="relative z-10">
      {/* Hero */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden border-b border-brand-muted/20 px-4 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(222,241,87,0.14),transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-5xl py-10 text-center sm:py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-lime sm:text-base">
            Web3 · Privacy-first
          </p>
          <h1 className="mt-6 text-pretty text-[clamp(2.75rem,9vw,5.75rem)] font-semibold leading-[1.02] tracking-tight text-brand-cream">
            Sealed-Bid Auction
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-2xl leading-snug text-brand-cream/90">
            A trustless auction where bids stay hidden until the end
          </p>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-sm leading-relaxed text-brand-muted">
            No floor manipulation, no sniping, no insider info. Fair auctions
            powered by privacy.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:mt-14 sm:gap-5">
            <CreateAuctionCta size="xl" />
          </div>
        </div>
      </section>

      {/* Features — scroll-driven focus + blur (Framer Motion) */}
      <FeaturesScrollSection items={features} />

      {/* FAQ */}
      <section
        id="faq"
        className="border-t border-brand-muted/20 py-16 sm:py-24 [scrollbar-gutter:stable]"
      >
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-brand-cream sm:text-4xl">
            FAQ
          </h2>
          <dl className="mt-8 space-y-4 sm:mt-10 sm:space-y-5">
            <details className="group w-full min-w-0 rounded-xl border border-brand-muted/40 bg-brand-cream/3 py-5 pl-5 pr-6 backdrop-blur-sm transition hover:border-brand-muted/60 sm:py-6 sm:pl-6 sm:pr-10">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-lg font-medium leading-snug text-brand-cream sm:gap-4 sm:text-xl [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 pr-1">
                  Is this real on-chain?
                </span>
                <span
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-lime/25 bg-brand-lime/8 p-2 text-brand-lime transition-transform duration-200 ease-out group-open:rotate-180 sm:p-2.5"
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5 sm:size-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-base leading-relaxed text-brand-cream/80 sm:text-lg">
                This is a frontend prototype. Encryption and smart contracts are
                not connected.
              </p>
            </details>
            <details className="group w-full min-w-0 rounded-xl border border-brand-muted/40 bg-brand-cream/3 py-5 pl-5 pr-6 backdrop-blur-sm transition hover:border-brand-muted/60 sm:py-6 sm:pl-6 sm:pr-10">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-lg font-medium leading-snug text-brand-cream sm:gap-4 sm:text-xl [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 pr-1">
                  What happens to my bid?
                </span>
                <span
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-brand-lime/25 bg-brand-lime/8 p-2 text-brand-lime transition-transform duration-200 ease-out group-open:rotate-180 sm:p-2.5"
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5 sm:size-6"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </summary>
              <p className="mt-4 text-base leading-relaxed text-brand-cream/80 sm:text-lg">
                In production, bids would be encrypted and only revealed after
                the round closes. Here, buttons are demonstrative only.
              </p>
            </details>
          </dl>
        </div>
      </section>
    </div>
  );
}
