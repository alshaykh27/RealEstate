"use client";

import Image from "next/image";
import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { HERO_IMAGES } from "@/components/home/hero-images";
import { ScrollCue } from "@/components/motion/scroll-cue";
import { EASE } from "@/components/motion/reveal";
import { parsePromoVideo, YOUTUBE_EMBED_ORIGIN } from "@/lib/video";

/** Hold time per image before the next slow crossfade begins. */
const HOLD_MS = 7000;

/** Give up on the video and fall back to the crossfade if it hasn't played by then. */
const VIDEO_TIMEOUT_MS = 8000;

/** Official player script; injected only after the page's load event. */
const YOUTUBE_API_URL = "https://www.youtube.com/iframe_api";

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
 * Just enough of the IFrame API surface to type the calls we make without
 * pulling in the whole `@types/youtube` package.
 */
type YouTubePlayer = {
  destroy: () => void;
  getIframe: () => HTMLIFrameElement;
  mute: () => void;
  playVideo: () => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      host: string;
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
        onError: () => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Loads the IFrame API once, on demand (callers gate this on window `load`). */
let youTubeApiPromise: Promise<YouTubeApi> | null = null;
function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT) return Promise.resolve(window.YT);
  if (!youTubeApiPromise) {
    youTubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => {
        if (window.YT) resolve(window.YT);
        else reject(new Error("YouTube IFrame API loaded without YT"));
      };
      const script = document.createElement("script");
      script.src = YOUTUBE_API_URL;
      script.async = true;
      script.onerror = () => reject(new Error("YouTube IFrame API failed to load"));
      document.head.appendChild(script);
    });
  }
  return youTubeApiPromise;
}

/** Cover-scales the player-injected iframe the way an `object-cover` video would. */
function coverIframe(frame: HTMLIFrameElement) {
  frame.style.position = "absolute";
  frame.style.top = "50%";
  frame.style.left = "50%";
  frame.style.width = "177.78vh";
  frame.style.minWidth = "100%";
  frame.style.height = "56.25vw";
  frame.style.minHeight = "100%";
  frame.style.transform = "translate(-50%, -50%)";
  frame.style.border = "0";
}

/**
 * Full-bleed cinematic hero. When a promo video is configured (YouTube or a
 * direct .mp4/.webm URL) it autoplays muted and inline exactly once — no
 * controls, no loop. When it ends the photography crossfade and hero copy are
 * already underneath, so the hero simply returns to the images until a reload.
 *
 * Fallback ladder (keeps the image crossfade running): `prefers-reduced-motion`,
 * Save-Data / slow connections, video load error, autoplay blocked, or a load
 * timeout. The first image is the priority poster/LCP element and is only
 * removed from view after the video fires its first "playing" frame, so there is
 * no black flash. The video is not requested until after the page's load event,
 * and the YouTube IFrame API script is injected at that same point, keeping both
 * off the LCP critical path.
 *
 * A charcoal/obsidian overlay keeps the headline at WCAG AA contrast over bright
 * footage reserved for text — there is deliberately no visible video UI.
 */
export function Hero({
  locale,
  eyebrow,
  headline,
  subhead,
  ctaLabel,
  videoUrl,
  videoTitle,
}: {
  locale: string;
  eyebrow: string;
  headline: string;
  subhead: string;
  ctaLabel: string;
  videoUrl?: string | null;
  videoTitle: string;
}) {
  const reduce = useReducedMotion();
  const video = useMemo(() => parsePromoVideo(videoUrl), [videoUrl]);
  const count = HERO_IMAGES.length;

  const [index, setIndex] = useState(0);
  const [videoActive, setVideoActive] = useState(false);
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
  const youTubeHostRef = useRef<HTMLDivElement>(null);

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

  // Direct file playback: fade in on the first playing frame; on "ended" hand
  // the hero back to the photographs. No controls, no loop.
  useEffect(() => {
    if (!videoMounted || video?.kind !== "file") return;
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
    };
    const onEnded = () => setVideoActive(false);

    element.addEventListener("playing", onPlaying);
    element.addEventListener("ended", onEnded);
    element.addEventListener("error", fail);
    element.play().catch(fail);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      element.removeEventListener("playing", onPlaying);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", fail);
    };
  }, [videoMounted, video]);

  // YouTube playback via the IFrame Player API: same fade-in/ended behaviour,
  // with the nocookie host and the script loaded only once the page has loaded.
  useEffect(() => {
    if (!videoMounted || video?.kind !== "youtube") return;

    let cancelled = false;
    let player: YouTubePlayer | null = null;
    const fail = () => {
      if (!cancelled) setVideoFailed(true);
    };
    const timer = window.setTimeout(fail, VIDEO_TIMEOUT_MS);

    loadYouTubeApi()
      .then((YT) => {
        const host = youTubeHostRef.current;
        if (cancelled || !host) return;
        player = new YT.Player(host, {
          videoId: video.id,
          host: YOUTUBE_EMBED_ORIGIN,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            mute: 1,
            playsinline: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              const frame = player?.getIframe();
              if (frame) {
                frame.title = videoTitle;
                coverIframe(frame);
              }
              player?.mute();
              player?.playVideo();
            },
            onStateChange: (event) => {
              // 1 = playing, 0 = ended (PLAYER_STATE codes are stable API values).
              if (event.data === 1) {
                window.clearTimeout(timer);
                setVideoActive(true);
              } else if (event.data === 0) {
                setVideoActive(false);
              }
            },
            onError: fail,
          },
        });
      })
      .catch(fail);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      player?.destroy();
    };
  }, [videoMounted, video, videoTitle]);

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
            className="absolute inset-0 overflow-hidden transition-opacity duration-700 motion-reduce:transition-none"
            style={{ opacity: videoActive ? 1 : 0 }}
          >
            {video.kind === "file" ? (
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                src={video.url}
                muted
                playsInline
                autoPlay
                preload="auto"
              />
            ) : (
              <div ref={youTubeHostRef} className="absolute inset-0" />
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

      <ScrollCue />
    </section>
  );
}
