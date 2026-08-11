"use client";

import { Play } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { youtubeEmbedUrl, youtubeThumbnailUrl } from "../lib/youtube";

export function YouTubeVideo({
  active = false,
  className,
  onActivate,
  title,
  variant = "player",
  videoId,
}: {
  active?: boolean;
  className?: string;
  onActivate?: () => void;
  title: string;
  variant?: "facade" | "player";
  videoId: string | null;
}) {
  const embedUrl = videoId ? youtubeEmbedUrl(videoId) : null;
  const thumbnailUrl = videoId ? youtubeThumbnailUrl(videoId) : null;
  const showPlayer = variant === "player" || active;

  if (!embedUrl) {
    return (
      <div
        aria-label={`${title} 원본 영상 없음`}
        className={cn(
          "flex aspect-video items-center justify-center overflow-hidden rounded-lg border bg-muted/40 px-4 text-center text-xs text-muted-foreground",
          className,
        )}
        data-youtube-unavailable="true"
        role="img"
      >
        원본 영상을 재생할 수 없어요
      </div>
    );
  }

  if (!showPlayer) {
    return (
      <button
        aria-label={`${title} 원본 영상 플레이어 열기`}
        className={cn(
          "group/video relative block aspect-video w-full overflow-hidden rounded-lg border bg-neutral-950 text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className,
        )}
        data-youtube-facade="true"
        onClick={onActivate}
        type="button"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-85 transition-transform duration-200 group-hover/video:scale-[1.025] motion-reduce:transition-none"
          style={{ backgroundImage: thumbnailUrl ? `url("${thumbnailUrl}")` : undefined }}
        />
        <span aria-hidden="true" className="absolute inset-0 bg-black/15" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-black/75 shadow-sm transition-transform group-hover/video:scale-105 motion-reduce:transition-none">
            <Play className="ml-0.5 size-4 fill-current" />
          </span>
        </span>
      </button>
    );
  }

  return (
    <div
      className={cn("aspect-video overflow-hidden rounded-lg border bg-black", className)}
      data-youtube-player="true"
    >
      <iframe
        allow="encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="size-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={embedUrl}
        title={`${title} 원본 YouTube 영상`}
      />
    </div>
  );
}
