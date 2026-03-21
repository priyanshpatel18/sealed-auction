/**
 * Decorative vertical streaks + soft glow — CSS only, no images.
 */
export function BackgroundStreaks() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(90deg, transparent 0, transparent 96px, rgba(222,241,87,0.2) 96px, rgba(222,241,87,0.2) 98px)",
            "repeating-linear-gradient(90deg, transparent 0, transparent 180px, rgba(167,139,250,0.12) 180px, rgba(167,139,250,0.12) 182px)",
          ].join(", "),
        }}
      />
      <div className="absolute -top-32 left-1/2 h-96 w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(222,241,87,0.1),transparent_65%)]" />
    </div>
  );
}
