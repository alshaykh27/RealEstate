/**
 * Promo video helpers — shared by the public hero and the admin settings form.
 *
 * The hero accepts either a direct video file URL (https, .mp4/.webm) or a
 * YouTube link, which is rendered as a `youtube-nocookie` embed. Everything
 * here is pure and framework-free so it can run on the server (validation) and
 * in the browser (preview + playback).
 */

export type PromoVideo = { kind: "youtube"; id: string } | { kind: "file"; url: string };

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
    return { kind: "youtube", id };
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

/** Static thumbnail for the admin preview (no player, no third-party JS). */
export function youtubeThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
}
