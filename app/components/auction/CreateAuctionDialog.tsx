"use client";

import { Button } from "@/components/ui/Button";

export function CreateAuctionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-bg/80 p-4 backdrop-blur-sm"
    >
      <div className="max-w-md rounded-2xl border border-brand-muted/50 bg-brand-bg p-6 shadow-2xl shadow-brand-lime/10">
        <p className="text-sm text-brand-cream leading-relaxed">
          <strong className="text-brand-lime">Demo only.</strong> Auction creation
          is not wired in this prototype — you&apos;re seeing the intended UX
          flow.
        </p>
        <Button
          type="button"
          variant="primary"
          className="mt-6 w-full"
          onClick={onClose}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}
