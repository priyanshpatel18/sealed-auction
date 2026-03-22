"use client";

import {
  useCallback,
  useId,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";

type Props = {
  previewUrl: string | null;
  onFile: (file: File | null) => void;
  error?: string;
};

export function ImageUpload({ previewUrl, onFile, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0];
      if (!f || !f.type.startsWith("image/")) {
        onFile(null);
        return;
      }
      onFile(f);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
    },
    [handleFiles]
  );

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-brand-muted">
        Cover image
      </span>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={() => inputRef.current?.click()}
        className={`group relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-brand-muted/50 bg-brand-cream/[0.03] transition hover:border-brand-lime/40 hover:bg-brand-lime/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime ${error ? "border-red-400/40" : ""}`}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onInputChange}
        />
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Auction cover preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/90 via-transparent to-transparent" />
            <p className="relative z-10 mt-auto pb-4 text-xs font-medium text-brand-cream/90">
              Click or drop to replace
            </p>
          </>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-brand-lime/30 bg-brand-lime/10 text-brand-lime transition group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-6 w-6"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-brand-cream">
              Drop an image here
            </p>
            <p className="mt-1 text-xs text-brand-muted">or click to browse</p>
          </div>
        )}
      </div>
      {error ? <p className="text-xs text-red-300/90">{error}</p> : null}
    </div>
  );
}
