"use client";

import { useState } from "react";
import { CreateAuctionDialog } from "@/components/auction/CreateAuctionDialog";
import { Button } from "@/components/ui/Button";

export function CreateAuctionCta({
  className,
  size = "lg",
}: {
  className?: string;
  size?: "lg" | "xl";
} = {}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        Create Auction
      </Button>
      <CreateAuctionDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
