export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeVideoId(value: unknown) {
  return typeof value === "string" && YOUTUBE_VIDEO_ID_PATTERN.test(value) ? value : null;
}

export function youtubeEmbedUrl(videoId: string) {
  const parsed = parseYouTubeVideoId(videoId);
  return parsed ? `https://www.youtube-nocookie.com/embed/${parsed}?autoplay=0&playsinline=1&rel=0` : null;
}

export function youtubeThumbnailUrl(videoId: string) {
  const parsed = parseYouTubeVideoId(videoId);
  return parsed ? `https://i.ytimg.com/vi/${parsed}/hqdefault.jpg` : null;
}
