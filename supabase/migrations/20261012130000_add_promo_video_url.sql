-- -----------------------------------------------------------------------------
-- promo_video_url — optional cinematic promotional video for the landing hero.
--
-- The client manages this from the admin settings screen. It accepts either a
-- direct video file URL (https, .mp4/.webm) or a YouTube link, which the public
-- hero renders as a youtube-nocookie embed.
--
-- Nullable: when empty, the hero keeps its existing image crossfade only.
-- No storage bucket is added — the video is never uploaded to Supabase.
-- -----------------------------------------------------------------------------
begin;

alter table public.site_settings
  add column if not exists promo_video_url text;

commit;
