import type { Transition } from "motion/react";

/** The few motions the kit uses. Things grow out of what opened them and fold back. */
export const SPRING = {
  /** a marker sliding under a tab */
  snap: { type: "spring", stiffness: 520, damping: 40 },
  /** a panel opening, a list sliding */
  glide: { type: "spring", stiffness: 340, damping: 34 },
  /** something arriving: a card, a sheet */
  arrive: { type: "spring", stiffness: 420, damping: 32 },
  /** a heart filling */
  pop: { type: "spring", stiffness: 600, damping: 18 },
} satisfies Record<string, Transition>;

export const TWEEN = {
  fade: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
  exit: { duration: 0.12, ease: [0.4, 0, 1, 1] },
} satisfies Record<string, Transition>;

/** Content that swaps in place fades rather than jumps. */
export const SWAP = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: TWEEN.exit },
  transition: TWEEN.fade,
};
