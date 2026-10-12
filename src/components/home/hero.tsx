"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { HERO_IMAGES } from "@/components/home/hero-images";
import { ScrollCue } from "@/components/motion/scroll-cue";
import { EASE } from "@/components/motion/reveal";
import { parsePromoVideo, YOUTUBE_EMBED_ORIGIN, youtubeHeroEmbedUrl } from "@/lib/video";

/** Hold time per image before the next slow crossfade begins. */
const HOLD_MS = 7000;

/** Give up on the video and fall back to the crossfade if it hasn't played by then. */
const VIDEO_TIMEOUT_MS = 8000;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

type NetworkInformation = {
  saveData?: boolean;
  addEventListener?: (t: string, cb: () => void) => void;
  removeEventListener?: (t: string, cb: () => void) => void;
};

function networkConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection;
}

function subscribeSaveData(callback: () => void): () => void {
  const connection = networkConnection();
  if (!connection?.addEventListener) return () => {};
  connection.addEventListener("change", callback);
  return () => connection.removeEventListener?.("change", callback);
}

/** True once the browser has finished loading (protects the video from LCP). */
function subscribeLoaded(callback: () => void): () => void {
  if (document.readyState === "complete") return () => {};
  window.addEventListener("load", callback, { once: true });
  return () => window.removeEventListener("load", callback);
}

/**
 * Full-bleed cinematic hero. When a promo video is configured (YouTube or a
 * direct .mp4/.webm URL) it plays muted, looping and inline, and the photography
 * fades out once playback actually starts; otherwise the images crossfade on
 * their own.
 *
 * Fallback ladder (keeps the image crossfade running): `prefers-reduced-motion`,
 * Save-Data / slow connections, video load error, autoplay blocked, or a load
 * timeout. The first image is the priority poster/LCP element and is only
 * removed from view after the video fires its first "playing" frame, so there is
 * no black flash. The video is not requested until after the page's load event,
 * keeping it off the LCP critical path.
 *
 * A charcoal/obsidian overlay keeps the headline at WCAG AA contrast over bright
 * footage. A visible pause/play control (the only video UI) sits bottom-inline.
 */
export function Hero({
  locale,
  eyebrow,
  headline,
  subhead,
  ctaLabel,
  videoUrl,
  videoPauseLabel,
  videoPlayLabel,
  videoTitle,
}: {
  locale: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  ctaLabel: string;
  videoUrl?: string | null;
  videoPauseLabel: string;
  videoPlayLabel: string;
  videoTitle: string;
}) {
  const reduce = useReducedMotion();
  const video = useMemo(() => parsePromoVideo(videoUrl), [videoUrl]);
  const count = HERO_IMAGES.length;

  const [index, setIndex] = useState(0);
  const [videoActive, setVideoActive] = useState(false);
  const [videoPaused, setVideoPaused] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const ready = useSyncExternalStore(
    subscribeLoaded,
    () => document.readyState === "complete",
    () => false,
  );
  const saveData = useSyncExternalStore(
    subscribeSaveData,
    () => Boolean(networkConnection()?.saveData),
    () => false,
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /** Video is eligible to load and has not failed (reduced motion / Save-Data opt out). */
  const videoEnabled = Boolean(video) && !reduce && !saveData;
  /** Video is mounted: eligible, page has loaded, and it hasn't failed. */
  const videoMounted = videoEnabled && ready && !videoFailed;
  /** Video is on screen; the photograph can fade out. */
  const videoOverlay = videoMounted && videoActive;

  useEffect(() => {
    if (reduce || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), HOLD_MS);
    return () => window.clearInterval(id);
  }, [reduce, count]);

  // Playback wiring: mark playing/paused, and fall back on error or timeout.
  useEffect(() => {
    if (!videoMounted || !video) return;

    if (video.kind === "file") {
      const element = videoRef.current;
      if (!element) return;
      let cancelled = false;
      const fail = () => {
        if (!cancelled) setVideoFailed(true);
      };
      const timer = window.setTimeout(fail, VIDEO_TIMEOUT_MS);
      const onPlaying = () => {
        window.clearTimeout(timer);
        setVideoActive(true);
        setVideoPaused(false);
      };
      const onPlay = () => setVideoPaused(false);
      const onPause = () => setVideoPaused(true);

      element.addEventListener("playing", onPlaying);
      element.addEventListener("play", onPlay);
      element.addEventListener("pause", onPause);
      element.addEventListener("error", fail);
      element.play().catch(fail);

      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        element.removeEventListener("playing", onPlaying);
        element.removeEventListener("play", onPlay);
        element.removeEventListener("pause", onPause);
        element.removeEventListener("error", fail);
      };
    }

    const timer = window.setTimeout(() => setVideoFailed(true), VIDEO_TIMEOUT_MS);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== YOUTUBE_EMBED_ORIGIN) return;
      let payload: { event?: string; info?: number };
      try {
        payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (payload?.event !== "onStateChange") return;
      if (payload.info === 1) {
        window.clearTimeout(timer);
        setVideoActive(true);
        setVideoPaused(false);
      } else if (payload.info === 2) {
        setVideoPaused(true);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [videoMounted, video]);

  function handleIframeLoad() {
    const frame = iframeRef.current?.contentWindow;
    if (!frame) return;
    frame.postMessage(JSON.stringify({ event: "listening", id: 1 }), YOUTUBE_EMBED_ORIGIN);
    frame.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      YOUTUBE_EMBED_ORIGIN,
    );
  }

  function toggleVideo() {
    if (!video) return;
    if (video.kind === "file") {
      const element = videoRef.current;
      if (!element) return;
      if (element.paused) element.play().catch(() => setVideoFailed(true));
      else element.pause();
      return;
    }
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: videoPaused ? "playVideo" : "pauseVideo",
        args: [],
      }),
      YOUTUBE_EMBED_ORIGIN,
    );
  }

  return (
    <section className="on-dark bg-obsidian relative isolate flex min-h-[90vh] items-center overflow-hidden">
      <div className="absolute inset-0 -z-20" aria-hidden>
        {/* PLACEHOLDER stock photography — slow crossfade, the video's poster. */}
        <div
          className="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
          style={{ opacity: videoOverlay ? 0 : 1 }}
        >
          {HERO_IMAGES.map((image, i) => (
            <div
              key={image.src}
              className="absolute inset-0 transition-opacity duration-[1500ms] ease-out motion-reduce:transition-none"
              style={{ opacity: index === i ? 1 : 0 }}
            >
              <Image
                src={image.src}
                alt=""
                fill
                sizes="100vw"
                preload={i === 0}
                className="hero-drift object-cover"
              />
            </div>
          ))}
        </div>

        {/* Promo video — fades in over the photograph once it is playing. */}
        {videoMounted && video ? (
          <div
            className="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
            style={{ opacity: videoActive ? 1 : 0 }}
          >
            {video.kind === "file" ? (
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                src={video.url}
                muted
                loop
                playsInline
                autoPlay
                preload="auto"
              />
            ) : (
              <iframe
                ref={iframeRef}
                className="pointer-events-none absolute top-1/2 left-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2"
                src={youtubeHeroEmbedUrl(video)}
                title={videoTitle}
                allow="autoplay; encrypted-media; picture-in-picture"
                onLoad={handleIframeLoad}
              />
            )}
          </div>
        ) : null}
      </div>

      <div className="bg-obsidian/60 absolute inset-0 -z-10" aria-hidden />
      <div
        className="from-obsidian via-obsidian/40 absolute inset-0 -z-10 bg-gradient-to-t to-transparent"
        aria-hidden
      />
      <div
        className="from-obsidian/70 absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b to-transparent"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-6xl px-6 py-32">
        <m.div
          className="flex max-w-2xl flex-col items-start gap-6 text-start"
          variants={container}
          initial="hidden"
          animate="show"
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

      {videoMounted ? (
        <button
          type="button"
          onClick={toggleVideo}
          aria-label={videoPaused ? videoPlayLabel : videoPauseLabel}
          className="text-on-dark border-on-dark/40 hover:bg-on-dark/10 focus-visible:outline-focus-ring absolute end-6 bottom-6 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {videoPaused ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
            </svg>
          )}
        </button>
      ) : null}

      <ScrollCue />
    </section>
  );
}
