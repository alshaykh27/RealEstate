"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useState } from "react";

import { ScrollCue } from "@/components/motion/scroll-cue";
import { EASE } from "@/components/motion/reveal";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/**
 * Full-bleed cinematic hero. When a cover photo is available it drifts
 * (parallax) over a designed charcoal/navy gradient; if the photo is missing
 * or fails to load, the gradient + gold hairline motif remains as an
 * intentional backdrop. The single primary CTA is the only action here.
 */
export function Hero({
  locale,
  eyebrow,
  headline,
  subhead,
  ctaLabel,
  imageUrl,
}: {
  locale: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  ctaLabel: string;
  imageUrl: string | null;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 800], [0, 120]);
  const scrimOpacity = useTransform(scrollY, [0, 600], [0.5, 0.85]);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <section className="on-dark bg-obsidian relative isolate flex min-h-[90vh] items-center overflow-hidden">
      <m.div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={reduce ? undefined : { y: parallaxY }}
        initial={reduce ? undefined : { scale: 1.06 }}
        animate={reduce ? undefined : { scale: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
      >
        <div className="from-obsidian via-navy-deep to-obsidian absolute inset-0 bg-gradient-to-br" />
        <div className="bg-gold/10 absolute end-[-8%] -top-24 h-[32rem] w-[32rem] rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, var(--color-gold) 0 1px, transparent 1px 96px)",
          }}
        />
        {showImage ? (
          <Image
            src={imageUrl as string}
            alt=""
            fill
            preload
            sizes="100vw"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : null}
      </m.div>

      <m.div
        aria-hidden="true"
        className="from-obsidian via-obsidian/50 absolute inset-0 -z-10 bg-gradient-to-t to-transparent"
        style={reduce ? undefined : { opacity: scrimOpacity }}
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
