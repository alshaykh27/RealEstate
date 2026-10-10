"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { HERO_IMAGES } from "@/components/home/hero-images";
import { ScrollCue } from "@/components/motion/scroll-cue";
import { EASE } from "@/components/motion/reveal";

/** Hold time per image before the next slow crossfade begins. */
const HOLD_MS = 7000;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/**
 * Full-bleed cinematic hero. Real property photography (currently placeholder
 * stock — see `hero-images.ts`) slowly crossfades between frames, each with a
 * gentle Ken Burns drift (`hero-drift`). A charcoal/obsidian scrim keeps the
 * headline readable over bright golden-hour skies.
 *
 * Reduced motion: frozen on the first frame — no crossfade, no drift. The
 * crossfade is JS-gated here; the drift is a CSS animation neutralised by the
 * global `prefers-reduced-motion` rule in `globals.css`.
 *
 * The single primary CTA is the only action in this section.
 */
export function Hero({
  locale,
  eyebrow,
  headline,
  subhead,
  ctaLabel,
}: {
  locale: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  ctaLabel: string;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const count = HERO_IMAGES.length;
  const activeIndex = reduce ? 0 : index;

  useEffect(() => {
    if (reduce || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), HOLD_MS);
    return () => window.clearInterval(id);
  }, [reduce, count]);

  return (
    <section className="on-dark bg-obsidian relative isolate flex min-h-[90vh] items-center overflow-hidden">
      {/* PLACEHOLDER stock photography — slow crossfade, background only. */}
      <div aria-hidden="true" className="absolute inset-0 -z-20">
        {HERO_IMAGES.map((img, i) => (
          <m.div
            key={img.src}
            className="absolute inset-0"
            initial={false}
            animate={{ opacity: i === activeIndex ? 1 : 0 }}
            transition={{ duration: reduce ? 0 : 1.2, ease: "easeInOut" }}
          >
            <Image
              src={img.src}
              alt=""
              fill
              sizes="100vw"
              preload={i === 0}
              className="hero-drift object-cover"
              style={reduce ? undefined : { animationDelay: `${i * -4}s` }}
            />
          </m.div>
        ))}
      </div>

      {/* Charcoal/obsidian scrim for headline contrast over bright photos. */}
      <div aria-hidden="true" className="bg-obsidian/60 absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="from-obsidian via-obsidian/40 absolute inset-0 -z-10 bg-gradient-to-t to-transparent"
      />
      <div
        aria-hidden="true"
        className="from-obsidian/70 absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b to-transparent"
      />

      <div className="mx-auto w-full max-w-6xl px-6 py-32">
        <m.div
          className="flex max-w-2xl flex-col items-start gap-6 text-start"
          variants={container}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "show"}
        >
          <m.p
            variants={item}
            className="font-heading text-gold text-sm font-medium tracking-[0.2em] uppercase"
          >
            {eyebrow}
          </m.p>
          <m.h1
            variants={item}
            className="text-on-dark text-4xl leading-[1.1] font-bold text-balance sm:text-6xl"
          >
            {headline}
          </m.h1>
          <m.p variants={item} className="text-on-dark-secondary max-w-xl text-lg leading-relaxed">
            {subhead}
          </m.p>
          <m.div variants={item}>
            <Link href={`/${locale}/properties`} className="btn btn-primary">
              {ctaLabel}
            </Link>
          </m.div>
        </m.div>
      </div>

      <ScrollCue />
    </section>
  );
}
