"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Lazily loads the DOM animation feature bundle once for the whole app, so
 * `m.*` components elsewhere stay lightweight. Wrap the tree in the locale
 * layout; server children pass through untouched.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </MotionConfig>
  );
}
