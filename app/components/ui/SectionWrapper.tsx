import type { ReactNode } from "react";

export function SectionWrapper({
  id,
  title,
  subtitle,
  children,
  className = "",
  contentClassName = "",
}: {
  id?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section id={id} className={className}>
      <div className={`mx-auto max-w-6xl px-4 sm:px-6 ${contentClassName}`}>
        {title ? (
          <div className="mb-10 text-center sm:mb-12">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-cream sm:text-3xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mx-auto mt-3 max-w-2xl text-sm text-brand-muted leading-relaxed">
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}
