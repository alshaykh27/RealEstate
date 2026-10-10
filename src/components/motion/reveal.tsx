"use client";

import { m, useReducedMotion } from "motion/react";
import { Children, type ReactNode } from "react";

/** Shared cinematic ease — slow-out, never bouncy. */
export const EASE = [0.16, 1, 0.3, 1] as const;
export const REVEAL_VIEWPORT = { once: true, margin: "0px 0px -15% 0px" } as const;

/**
 * Fade + rise as the element scrolls into view (once). Renders a static
 * wrapper when the user prefers reduced motion.
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
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

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
 * Staggered reveal for a set of siblings (section headers, card rows).
 * Each child is wrapped in a motion element; on reduced motion they render
 * as plain stacked content.
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
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

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
