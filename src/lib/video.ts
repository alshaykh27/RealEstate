/**
 * Promo video helpers — shared by the public hero and the admin settings form.
 *
 * The hero accepts either a direct video file URL (https, .mp4/.webm) or a
 * YouTube link, which is rendered as a `youtube-nocookie` embed. Everything
 * here is pure and framework-free so it can run on the server (validation) and
 * in the browser (preview + playback).
 */

export type PromoVideo =
  { kind: "youtube"; id: string; embedUrl: string } | { kind: "file"; url: string };

const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";
export { YOUTUBE_EMBED_ORIGIN };
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
]);

function youtubeId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  const [first, second] = url.pathname.split("/").filter(Boolean);
  if (first === "embed" || first === "shorts" || first === "live") {
    return second ?? null;
  }

  return null;
}

/** Parses a stored value into a resolved promo video, or `null` if invalid/empty. */
export function parsePromoVideo(raw: string | null | undefined): PromoVideo | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;

  const id = youtubeId(url);
  if (id) {
    return {
      kind: "youtube",
      id,
      embedUrl: `${YOUTUBE_EMBED_ORIGIN}/embed/${encodeURIComponent(id)}`,
    };
  }

  if (/\.(mp4|webm)$/i.test(url.pathname)) {
    return { kind: "file", url: url.toString() };
  }

  return null;
}

/** True when the value is empty (allowed) or a valid promo video URL. */
export function isValidPromoVideoUrl(raw: string | null | undefined): boolean {
  const value = (raw ?? "").trim();
  if (!value) return true;
  return parsePromoVideo(value) !== null;
}

/** Autoplaying, muted, looping, chrome-free embed URL for the public hero. */
export function youtubeHeroEmbedUrl(video: Extract<PromoVideo, { kind: "youtube" }>): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: video.id,
    controls: "0",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
    disablekb: "1",
    enablejsapi: "1",
    origin: typeof window !== "undefined" ? window.location.origin : "",
  });
  return `${video.embedUrl}?${params.toString()}`;
}

/** YouTube REST controls use the `www.youtube-nocookie.com` origin. */
export const YOUTUBE_IFRAME_ORIGIN = YOUTUBE_EMBED_ORIGIN;

/** Static thumbnail for the admin preview (no player, no third-party JS). */
export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}
