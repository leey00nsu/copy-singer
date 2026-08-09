import type { VocalProfileDescriptors } from "./contract";

export type AudioSourceRange = { startSeconds: number; endSeconds: number };
export type ReferenceBandSegment = {
  id: "low" | "mid" | "high";
  label: string;
  ranges: AudioSourceRange[];
};

const BAND_LABELS = { low: "저음 영역", mid: "중앙 영역", high: "고음 영역" } as const;

function analysisBandDescriptor(descriptors: VocalProfileDescriptors | null) {
  if (!descriptors) return null;
  const analysisBands = descriptors.analysisReferenceBands;
  if (analysisBands && typeof analysisBands === "object" && !Array.isArray(analysisBands))
    return analysisBands as Record<string, unknown>;
  const synthesisReference = descriptors.synthesisReference;
  if (synthesisReference && typeof synthesisReference === "object" && !Array.isArray(synthesisReference))
    return synthesisReference as Record<string, unknown>;
  return null;
}

export function referenceBandAvailability(descriptors: VocalProfileDescriptors | null) {
  const reference = analysisBandDescriptor(descriptors);
  if (!reference) return "legacy" as const;
  if (reference.status === "unavailable") return "unavailable" as const;
  return referenceBandSegments(descriptors).length > 0 ? ("ready" as const) : ("legacy" as const);
}

export function referenceBandSegments(descriptors: VocalProfileDescriptors | null): ReferenceBandSegment[] {
  const reference = analysisBandDescriptor(descriptors);
  if (!reference) return [];
  const sourceRanges = reference.sourceRanges;
  if (!Array.isArray(sourceRanges)) return [];
  const grouped: Record<ReferenceBandSegment["id"], AudioSourceRange[]> = { low: [], mid: [], high: [] };
  for (const value of sourceRanges) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const { band, startMs, endMs } = value as Record<string, unknown>;
    if (
      (band !== "low" && band !== "mid" && band !== "high") ||
      typeof startMs !== "number" ||
      typeof endMs !== "number" ||
      endMs <= startMs
    )
      continue;
    grouped[band].push({ startSeconds: startMs / 1000, endSeconds: endMs / 1000 });
  }
  return (["low", "mid", "high"] as const)
    .filter((band) => grouped[band].length > 0)
    .map((band) => ({
      id: band,
      label: BAND_LABELS[band],
      ranges: grouped[band].sort((a, b) => a.startSeconds - b.startSeconds),
    }));
}
