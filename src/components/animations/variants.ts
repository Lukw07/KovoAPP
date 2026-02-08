import type { Transition, Variants } from "framer-motion";

/* ============================================================================
   SPRING PRESETS — Premium physics-based easing
   ============================================================================ */

export const springPresets = {
  /** Snappy — buttons, toggles, micro-interactions (IBM Productive) */
  snappy: { type: "spring", stiffness: 500, damping: 30, mass: 0.8 } as const,
  /** Smooth — cards, modals, page elements (IBM Expressive) */
  smooth: { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const,
  /** Bouncy — success states, celebrations, attention */
  bouncy: { type: "spring", stiffness: 400, damping: 15, mass: 0.8 } as const,
  /** Gentle — layout shifts, large elements */
  gentle: { type: "spring", stiffness: 200, damping: 25, mass: 1.2 } as const,
  /** Elastic — playful, gamified elements */
  elastic: { type: "spring", stiffness: 600, damping: 12, mass: 0.6 } as const,
} satisfies Record<string, Transition>;

/* ============================================================================
   EASING CURVES — Vercel/Linear inspired
   ============================================================================ */

export const easings = {
  /** Productive motion — fast, functional */
  productive: [0.2, 0, 0.38, 0.9] as [number, number, number, number],
  /** Expressive motion — smooth deceleration */
  expressive: [0.4, 0.14, 0.3, 1] as [number, number, number, number],
  /** Enter — strong deceleration */
  enter: [0, 0, 0.2, 1] as [number, number, number, number],
  /** Exit — quick acceleration */
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
  /** Emphasis — dramatic overshoot */
  emphasis: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

/* ============================================================================
   ANIMATION VARIANTS
   ============================================================================ */

/** Full page transition — slide + fade */
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 16,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: easings.expressive,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: {
      duration: 0.25,
      ease: easings.exit,
    },
  },
};

/** Simple fade in */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5, ease: easings.enter },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: easings.exit },
  },
};

/** Slide up with fade */
export const slideUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easings.emphasis },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.25, ease: easings.exit },
  },
};

/** Slide from direction */
export const slideIn = (direction: "left" | "right" | "up" | "down" = "left"): Variants => {
  const axis = direction === "left" || direction === "right" ? "x" : "y";
  const value =
    direction === "left" || direction === "up" ? -40 : 40;

  const initial = { opacity: 0, [axis]: value } as Record<string, number>;
  const animate = {
    opacity: 1,
    [axis]: 0,
    transition: { duration: 0.45, ease: easings.expressive },
  } as Record<string, unknown>;
  const exit = {
    opacity: 0,
    [axis]: value / 2,
    transition: { duration: 0.2, ease: easings.exit },
  } as Record<string, unknown>;

  return { initial, animate, exit } as Variants;
};

/** Scale in from center */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: springPresets.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: easings.exit },
  },
};

/** Stagger container — orchestrates children */
export const staggerContainer = (
  staggerDelay = 0.06,
  delayChildren = 0.1,
): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: staggerDelay,
      delayChildren,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
});

/** Stagger item — child of stagger container */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: easings.emphasis,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: easings.exit,
    },
  },
};
