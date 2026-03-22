import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative z-20 mt-auto border-t border-brand-muted/40 bg-brand-bg/90">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-end sm:px-6">
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
