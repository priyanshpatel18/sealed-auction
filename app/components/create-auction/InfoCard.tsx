import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export function InfoCard({ children, className = "" }: Props) {
  return (
    <aside
      className={`rounded-2xl border border-brand-lime/25 bg-gradient-to-br from-brand-lime/[0.08] to-transparent p-5 shadow-[0_0_40px_-20px_rgba(222,241,87,0.35)] backdrop-blur-sm sm:p-6 ${className}`}
      role="note"
    >
      <div className="flex gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-lime/15 text-brand-lime"
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <div className="min-w-0 text-sm leading-relaxed text-brand-cream/95">
          {children}
        </div>
      </div>
    </aside>
  );
}
