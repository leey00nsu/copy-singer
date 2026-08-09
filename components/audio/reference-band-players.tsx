"use client";

import { useEffect, useState } from "react";
import { AudioWaveformPlayer } from "@/components/audio/audio-waveform-player";
import { createReferencePreviewBlob } from "@/lib/audio/reference-preview";
import type { ReferenceBandSegment } from "@/lib/vocal-profile/reference-segments";

type ReferencePreview = { segment: ReferenceBandSegment; url: string };
type PreviewState =
  | { status: "loading"; previews: [] }
  | { status: "ready"; previews: ReferencePreview[] }
  | { status: "error"; previews: [] };

export function ReferenceBandPlayers({
  segments,
  sourceAudioSrc,
}: {
  segments: ReferenceBandSegment[];
  sourceAudioSrc: string;
}) {
  const [state, setState] = useState<PreviewState>({ status: "loading", previews: [] });

  useEffect(() => {
    let active = true;
    let previewUrls: string[] = [];

    async function prepare() {
      const response = await fetch(sourceAudioSrc, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error(`Could not load the reference source (${response.status}).`);
      const context = new AudioContext();
      try {
        const decoded = await context.decodeAudioData(await response.arrayBuffer());
        const previews = segments.map((segment) => {
          const url = URL.createObjectURL(createReferencePreviewBlob(decoded, segment.ranges));
          previewUrls.push(url);
          return { segment, url };
        });
        if (!active) {
          previewUrls.forEach((url) => {
            URL.revokeObjectURL(url);
          });
          previewUrls = [];
          return;
        }
        setState({ status: "ready", previews });
      } finally {
        await context.close();
      }
    }

    void prepare().catch(() => {
      if (active) setState({ status: "error", previews: [] });
    });
    return () => {
      active = false;
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [segments, sourceAudioSrc]);

  if (state.status === "error") {
    return (
      <div className="rounded-xl border border-dashed bg-muted/25 p-5 text-sm leading-6 text-muted-foreground">
        선택된 음역 구간의 파형을 만들지 못했어요. 페이지를 새로고침한 뒤 다시 시도해주세요.
      </div>
    );
  }

  const items = state.status === "ready" ? state.previews : segments.map((segment) => ({ segment, url: null }));

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {items.map(({ segment, url }) => (
        <section className="space-y-2" key={segment.id}>
          <div>
            <h3 className="text-sm font-semibold">{segment.label}</h3>
            <p className="text-xs text-muted-foreground">
              채택된 구간 {segment.ranges.length}개 · 기본 10초 목표, 부족분 재분배 가능
            </p>
          </div>
          {url ? (
            <AudioWaveformPlayer label={segment.label} src={url} />
          ) : (
            <div
              aria-label={`${segment.label} 파형 준비 중`}
              className="flex min-h-32 items-center justify-center rounded-xl border bg-muted/20 text-xs text-muted-foreground"
              role="status"
            >
              선택 구간 파형 준비 중…
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
