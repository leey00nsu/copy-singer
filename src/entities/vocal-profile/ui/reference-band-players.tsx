"use client";

import { useEffect, useState } from "react";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { StatusNotice } from "@/shared/ui/status-notice";
import { createReferencePreviewBlob } from "../lib/reference-preview";
import type { ReferenceBandSegment } from "../model/reference-segments";

type ReferencePreview = { segment: ReferenceBandSegment; url: string };
type PreviewState =
  | { status: "loading"; previews: [] }
  | { status: "ready"; previews: ReferencePreview[] }
  | { status: "error"; previews: [] };

const REFERENCE_BANDS = [
  { id: "low", label: "저음 영역" },
  { id: "mid", label: "중앙 영역" },
  { id: "high", label: "고음 영역" },
] as const;

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
      <StatusNotice
        description="페이지를 새로고침한 뒤 다시 시도해 주세요."
        title="선택된 음역 구간의 파형을 만들지 못했어요."
        tone="warning"
      />
    );
  }

  const segmentById = new Map(segments.map((segment) => [segment.id, segment]));
  const previewById = new Map(
    state.status === "ready" ? state.previews.map((preview) => [preview.segment.id, preview]) : [],
  );

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {REFERENCE_BANDS.map((band) => {
        const segment = segmentById.get(band.id);
        const preview = previewById.get(band.id);
        return (
          <section className="space-y-2" key={band.id}>
            <div>
              <h3 className="text-xs font-semibold">{band.label}</h3>
              {segment ? (
                <p className="text-[10px] text-muted-foreground">선택된 구간 {segment.ranges.length}개</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">선택된 구간 없음</p>
              )}
            </div>
            {!segment ? (
              <div
                className="flex min-h-24 items-center justify-center rounded-xl bg-muted/35 px-4 text-center text-xs leading-5 text-muted-foreground"
                role="status"
              >
                {band.label}을 충분히 찾지 못했어요.
              </div>
            ) : preview ? (
              <AudioWaveformPlayer label={segment.label} src={preview.url} />
            ) : (
              <div
                aria-label={`${segment.label} 파형 준비 중`}
                className="flex min-h-24 animate-pulse items-center justify-center rounded-xl bg-muted/35 text-[10px] text-muted-foreground motion-reduce:animate-none"
                role="status"
              >
                선택 구간 파형 준비 중…
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
