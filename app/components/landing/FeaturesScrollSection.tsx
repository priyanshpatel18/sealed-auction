"use client";

import { useEffect, useRef, useState } from "react";
import type { MotionValue } from "framer-motion";
import {
  motion,
  useMotionTemplate,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

export type FeatureItem = {
  title: string;
  body: string;
};

const STACK_X = -150;
const STACK_FAN_X = -6;
const STACK_FAN_Y = 10;
/** Max horizontal spread from center (px); actual value scales down on narrow viewports. */
const LAND_SPREAD_X_MAX = 280;
const LAND_SPREAD_X_MIN = 120;
/** Must match landed `scale` in `cardTransform` — used for overlap-safe spacing. */
const LANDED_CARD_SCALE = 0.96;
/** Card min-heights (px) — align with `DealtCard` min-height caps. */
const CARD_MIN_H_PX_MOBILE = 15.5 * 16;
const CARD_MIN_H_PX_SM = 18 * 16; // sm: min-h caps at 18rem
/** Card max widths (px) — align with `min(…vw,…rem)` classes. */
const CARD_W_PX_SM = 26 * 16;
const CARD_W_PX_LG = 28 * 16;
const LAND_Y_BASE = -40;
/** Minimum gap between card rectangles on the same row (inner edges at center). */
const SAME_ROW_GAP_PX = 28;
/** Extra vertical gap between stacked rows (same column), beyond scaled card height. */
const ROW_STACK_EXTRA_PX = 36;
/** Projectile arc height (px, negative Y = up on screen). */
const PROJECTILE_ARC_PEAK = 118;
const STACK_BACK_BLUR = 3.5;

/** Even indices → left, odd → right (0 left, 1 right, …). */
function getLandSlot(i: number, spreadX: number, rowGap: number) {
  const toLeft = i % 2 === 0;
  const row = Math.floor(i / 2);
  return {
    x: toLeft ? -spreadX : spreadX,
    y: LAND_Y_BASE + row * rowGap,
  };
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Scroll phase 0…n: deal card 0 during [0,1), card 1 during [1,2), … */
function cardTransform(
  i: number,
  ph: number,
  n: number,
  spreadX: number,
  rowGap: number,
) {
  const land = getLandSlot(i, spreadX, rowGap);

  /**
   * z-index lives on the outer `absolute` wrapper (not the inner card) so sibling
   * layers compare correctly. Stack stays low; flight + landed sit above the deck.
   */
  /** Landed — sharp, each card in its own slot. */
  if (ph >= i + 1) {
    return {
      x: land.x,
      y: land.y,
      blur: 0,
      scale: LANDED_CARD_SCALE,
      opacity: 1,
      rotateZ: 0,
      zIndex: 200 + i,
    };
  }

  /** Projectile arc from stack → unique land point (parabolic bump on Y). */
  if (ph > i && ph < i + 1) {
    const t = easeInOutCubic(ph - i);
    const startX = STACK_X;
    const startY = 0;
    const arcY = -PROJECTILE_ARC_PEAK * Math.sin(Math.PI * t);
    const tossSign = land.x < 0 ? -1 : 1;
    const rz = Math.sin(Math.PI * t) * 9 * tossSign;
    return {
      x: lerp(startX, land.x, t),
      y: lerp(startY, land.y, t) + arcY,
      blur: 0,
      scale: lerp(1, LANDED_CARD_SCALE, t),
      opacity: 1,
      rotateZ: rz,
      zIndex: 600 + Math.round(t * 50),
    };
  }

  const ceil = Math.ceil(ph);
  const stackIndex = i - ceil;
  if (stackIndex < 0) {
    return {
      x: land.x,
      y: land.y,
      blur: 0,
      scale: LANDED_CARD_SCALE,
      opacity: 1,
      rotateZ: 0,
      zIndex: 200 + i,
    };
  }

  const sx = STACK_X + stackIndex * STACK_FAN_X;
  const sy = stackIndex * STACK_FAN_Y;
  const sc = 1 - stackIndex * 0.038;
  const rz = stackIndex * -2.2;

  return {
    x: sx,
    y: sy,
    blur: stackIndex === 0 ? 0 : STACK_BACK_BLUR + stackIndex * 1.2,
    scale: sc,
    opacity: stackIndex === 0 ? 1 : 0.88,
    rotateZ: rz,
    /** Deck: keep well below any in-flight or placed card */
    zIndex: 10 - stackIndex,
  };
}

function DealtCard({
  item,
  index,
  n,
  phase,
  landSpreadX,
  landRowGap,
}: {
  item: FeatureItem;
  index: number;
  n: number;
  phase: MotionValue<number>;
  landSpreadX: number;
  landRowGap: number;
}) {
  const x = useTransform(phase, (ph) =>
    cardTransform(index, ph, n, landSpreadX, landRowGap).x,
  );
  const y = useTransform(phase, (ph) =>
    cardTransform(index, ph, n, landSpreadX, landRowGap).y,
  );
  const blur = useTransform(phase, (ph) =>
    cardTransform(index, ph, n, landSpreadX, landRowGap).blur,
  );
  const scale = useTransform(phase, (ph) =>
    cardTransform(index, ph, n, landSpreadX, landRowGap).scale,
  );
  const opacity = useTransform(phase, (ph) =>
    cardTransform(index, ph, n, landSpreadX, landRowGap).opacity,
  );
  const rotateZ = useTransform(phase, (ph) =>
    cardTransform(index, ph, n, landSpreadX, landRowGap).rotateZ,
  );
  const zIndex = useTransform(phase, (ph) =>
    cardTransform(index, ph, n, landSpreadX, landRowGap).zIndex,
  );
  const filter = useMotionTemplate`blur(${blur}px)`;

  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-[min(30%,10.5rem)] -translate-x-1/2 -translate-y-1/2 sm:top-[min(28%,11rem)]"
      style={{ zIndex }}
    >
      <motion.article
        style={{
          x,
          y,
          scale,
          opacity,
          rotateZ,
          filter,
          transformStyle: "preserve-3d",
        }}
        className="feature-card relative flex min-h-[15.5rem] w-[min(92vw,20rem)] flex-col rounded-2xl border border-white/12 bg-linear-to-b from-white/[0.12] to-white/[0.04] px-5 py-6 shadow-[0_10px_40px_-14px_rgba(0,0,0,0.55)] backdrop-blur-md will-change-transform sm:min-h-[min(28vh,18rem)] sm:w-[min(92vw,26rem)] sm:px-7 sm:py-8 lg:w-[min(94vw,28rem)]"
      >
      <div className="mb-3 h-1 w-12 shrink-0 rounded-full bg-brand-lime/90 shadow-[0_0_14px_rgba(222,241,87,0.35)] sm:mb-4 sm:h-1.5 sm:w-14" />
      <h3 className="text-base font-semibold leading-snug tracking-tight text-brand-cream sm:text-lg">
        {item.title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-cream/72 sm:mt-4 sm:text-[0.9375rem]">
        {item.body}
      </p>
      </motion.article>
    </motion.div>
  );
}

function useLandLayout() {
  const [spreadX, setSpreadX] = useState(LAND_SPREAD_X_MAX);
  const [rowGap, setRowGap] = useState(
    Math.ceil(CARD_MIN_H_PX_SM * LANDED_CARD_SCALE) + ROW_STACK_EXTRA_PX,
  );

  useEffect(() => {
    const update = () => {
      const w =
        typeof window !== "undefined" ? window.innerWidth : LAND_SPREAD_X_MAX * 4;
      const margin = 24;
      const halfViewport = Math.max(140, (w - margin * 2) * 0.5 - 8);
      const isSm = w >= 640;
      const isLg = w >= 1024;

      const cardHalfW = isSm
        ? (isLg ? CARD_W_PX_LG : CARD_W_PX_SM) / 2
        : Math.min((20 * 16) / 2, (w * 0.92) / 2);

      /** Left/right pair: gap = 2*spreadX - 2*cardHalfW >= SAME_ROW_GAP_PX */
      const minSpreadSameRow = cardHalfW + SAME_ROW_GAP_PX / 2;
      const maxFromViewport = Math.min(
        LAND_SPREAD_X_MAX,
        Math.max(0, halfViewport - cardHalfW),
      );
      const spread = Math.max(
        LAND_SPREAD_X_MIN,
        Math.min(
          maxFromViewport,
          Math.max(minSpreadSameRow, LAND_SPREAD_X_MIN),
        ),
      );
      setSpreadX(spread);

      const cardMinH = isSm ? CARD_MIN_H_PX_SM : CARD_MIN_H_PX_MOBILE;
      /** Center-to-center step between rows: ≥ scaled card height + breathing room */
      const g =
        Math.ceil(cardMinH * LANDED_CARD_SCALE) + ROW_STACK_EXTRA_PX;
      setRowGap(g);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return { spreadX, rowGap };
}

export function FeaturesScrollSection({ items }: { items: FeatureItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const n = items.length;
  const { spreadX: landSpreadX, rowGap: landRowGap } = useLandLayout();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 32,
    damping: 34,
    mass: 1,
  });

  const phase = useTransform(smoothProgress, (p) => p * n);

  const scrollHeightVh = `${Math.max(4, n) * 220}vh`;

  return (
    <div
      ref={ref}
      className="relative border-t border-brand-muted/20"
      style={{ height: scrollHeightVh }}
    >
      <div className="sticky top-[var(--site-header-height)] z-0 flex h-[calc(100dvh-var(--site-header-height))] max-h-[calc(100dvh-var(--site-header-height))] flex-col items-center overflow-x-hidden overflow-y-visible px-3 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_38%,rgba(222,241,87,0.07),transparent_58%)]" />
        <div className="relative z-[1] w-full max-w-5xl shrink-0 px-1 text-center">
          <h2 className="text-pretty text-3xl font-semibold tracking-tight text-brand-cream sm:text-4xl lg:text-5xl xl:text-6xl">
            Built for fair markets
          </h2>
          <p className="mx-auto my-10 max-w-3xl text-pretty text-base leading-relaxed text-brand-cream/75 sm:mt-3 sm:text-lg lg:text-xl">
            Sealed bids, private execution, public verification — without
            trusting a central auction house.
          </p>
        </div>

        <div className="relative z-0 mt-2 min-h-0 w-full max-w-6xl flex-1 sm:mt-1">
          <div className="absolute inset-0 isolate overflow-visible [perspective:1400px]">
            {items.map((item, index) => (
              <DealtCard
                key={item.title}
                item={item}
                index={index}
                n={n}
                phase={phase}
                landSpreadX={landSpreadX}
                landRowGap={landRowGap}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
