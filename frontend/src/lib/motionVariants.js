// Shared motion variants. Duration/stagger tokens live here — not inlined.
// Every animation must have a static final-state fallback (reduced-motion) by
// design: we pass `initial` = final state when prefers-reduced-motion is set.

export const MOTION = {
  duration: { fast: 0.18, base: 0.28, slow: 0.42 },
  ease: [0.22, 1, 0.36, 1], // "expo out"-ish
  stagger: { card: 0.06, list: 0.05 },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: MOTION.duration.base, ease: MOTION.ease } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: MOTION.duration.base } },
};

export const listContainer = (staggerChildren = MOTION.stagger.card) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren: 0.02 } },
});

export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: MOTION.duration.base } },
  exit: { opacity: 0, transition: { duration: MOTION.duration.fast } },
};
