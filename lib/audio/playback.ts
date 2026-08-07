export function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

type PlaybackRange = { startSeconds: number; endSeconds: number };

export function playbackRangesDuration(ranges: PlaybackRange[]) {
  return ranges.reduce((total, range) => total + Math.max(0, range.endSeconds - range.startSeconds), 0);
}

export function playbackRangesElapsed(ranges: PlaybackRange[], rangeIndex: number, sourceTime: number) {
  if (rangeIndex < 0 || rangeIndex >= ranges.length) return 0;
  const previous = playbackRangesDuration(ranges.slice(0, rangeIndex));
  const range = ranges[rangeIndex]!;
  return previous + Math.min(Math.max(sourceTime - range.startSeconds, 0), Math.max(0, range.endSeconds - range.startSeconds));
}
