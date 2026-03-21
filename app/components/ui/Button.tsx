import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const variants = {
  primary:
    "bg-brand-lime text-brand-bg hover:opacity-95 shadow-[0_0_24px_-4px_rgba(222,241,87,0.45)]",
  secondary:
    "border border-brand-muted/80 bg-brand-cream/5 text-brand-cream hover:border-brand-lime/40 hover:bg-brand-lime/10",
  ghost: "text-brand-muted hover:text-brand-cream hover:bg-brand-cream/5",
} as const;

type Variant = keyof typeof variants;

type BaseProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  size?: "md" | "lg" | "xl";
};

const sizes = {
  md: "rounded-full px-6 py-2.5 text-sm font-semibold",
  lg: "rounded-full px-8 py-3.5 text-sm font-semibold",
  xl: "rounded-full px-10 py-4 text-base font-semibold",
} as const;

function cn(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: BaseProps & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: BaseProps & Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
