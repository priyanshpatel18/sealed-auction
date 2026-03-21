import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative z-10 mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-brand-cream">Not found</h1>
      <p className="mt-2 text-brand-muted">
        This auction doesn&apos;t exist in the mock catalog.
      </p>
      <Link
        href="/discover"
        className="mt-8 inline-block text-sm font-semibold text-brand-lime hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime"
      >
        Back to Discover
      </Link>
    </div>
  );
}
