"use client";

import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const MAX_TILT = 6;
const PERSPECTIVE = 900;
const SPRING = { stiffness: 150, damping: 20 };

/**
 * Subtle pointer-tracked 3D tilt for cards (max 6°). Disabled on touch input
 * and for reduced-motion users, where it renders a plain container.
 */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]), SPRING);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]), SPRING);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const reset = () => {
    px.set(0);
    py.set(0);
  };

  if (reduce) return <div className={cn("h-full", className)}>{children}</div>;

  return (
    <m.div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: PERSPECTIVE }}
      whileHover={{ y: -4 }}
      transition={SPRING}
      className={cn("h-full", className)}
    >
      {children}
    </m.div>
  );
}
