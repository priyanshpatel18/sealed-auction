"use client";

import { ButtonLink } from "@/components/ui/Button";

export function CreateAuctionCta({
  className,
  size = "lg",
}: {
  className?: string;
  size?: "lg" | "xl";
} = {}) {
  return (
    <ButtonLink
      href="/create-auction"
      variant="secondary"
      size={size}
      className={className}
    >
      Create auction
    </ButtonLink>
  );
}
