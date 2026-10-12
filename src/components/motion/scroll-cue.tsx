"use client";

import { m } from "motion/react";

/** Decorative scroll hint at the base of the hero. */
export function ScrollCue() {
  return (
    <div aria-hidden="true" className="absolute inset-x-0 bottom-6 flex justify-center">
      <m.span
        className="text-gold/70 block h-8 w-px bg-current"
        initial={{ scaleY: 0.4, opacity: 0.4, originY: 0 }}
        animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}
