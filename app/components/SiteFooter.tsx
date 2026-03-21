import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-20 mt-auto border-t border-brand-muted/40 bg-brand-bg/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-brand-muted">
          UI prototype — on-chain behavior mocked. Sealed-bid flows described for
          product narrative only.
        </p>
        <div className="flex flex-wrap gap-6 text-xs font-medium text-brand-muted">
          <Link
            href="/#faq"
            className="hover:text-brand-cream focus:outline-none focus-visible:text-brand-lime"
          >
            FAQ
          </Link>
          <Link
            href="/discover"
            className="hover:text-brand-cream focus:outline-none focus-visible:text-brand-lime"
          >
            Discover
          </Link>
          <span className="text-brand-muted/60">Docs (soon)</span>
        </div>
      </div>
    </footer>
  );
}
