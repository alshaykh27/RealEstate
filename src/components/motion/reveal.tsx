"use client";

import { m } from "motion/react";
import { Children, type ReactNode } from "react";

/** Shared cinematic ease — slow-out, never bouncy. */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const REVEAL_VIEWPORT = { once: true, margin: "0px 0px -15% 0px" } as const;

/**
 * Fade + rise as the element scrolls into view (once). Always renders the same
 * markup on server and client so hydration matches; reduced-motion users are
 * handled by `MotionConfig reducedMotion="user"`, which skips the transform and
 * leaves only the gentle opacity fade.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </m.div>
  );
}

/**
 * Staggered reveal for a set of siblings (section headers, card rows). Reduced
 * motion keeps the same markup but `MotionConfig` skips the rise, so the items
 * simply fade in.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.1,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}) {
  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={REVEAL_VIEWPORT}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {Children.map(children, (child, index) => (
        <m.div
          key={index}
          className="h-full"
          variants={{
            hidden: { opacity: 0, y },
            show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
          }}
        >
          {child}
        </m.div>
      ))}
    </m.div>
  );
}
