import type { PitchHistogramBin, PitchTrackPoint, VocalProfileDescriptors } from "./contract";
import { midiToNoteName } from "./pitch";

export type VocalProfileVisualization = {
  histogram: PitchHistogramBin[];
  track: PitchTrackPoint[];
};

export type VocalRangeMetrics = {
  minMidi: number;
  maxMidi: number;
  tessituraLowMidi: number;
  tessituraHighMidi: number;
};

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseVocalProfileVisualization(
  descriptors: VocalProfileDescriptors | null,
): VocalProfileVisualization | null {
  if (!descriptors || !Array.isArray(descriptors.pitchHistogram) || !Array.isArray(descriptors.pitchTrack)) {
    return null;
  }

  const histogram = descriptors.pitchHistogram.filter(
    (bin): bin is PitchHistogramBin =>
      Boolean(bin) &&
      finiteNumber(bin.midi) &&
      Number.isInteger(bin.midi) &&
      finiteNumber(bin.count) &&
      bin.count >= 0 &&
      finiteNumber(bin.ratio) &&
      bin.ratio >= 0 &&
      bin.ratio <= 1,
  );
  const track = descriptors.pitchTrack.filter(
    (point): point is PitchTrackPoint =>
      Boolean(point) &&
      finiteNumber(point.timeMs) &&
      point.timeMs >= 0 &&
      (point.midi === null || finiteNumber(point.midi)),
  );

  if (histogram.length === 0 || track.length === 0 || track.length > 720) return null;
  return {
    histogram: [...histogram].sort((a, b) => a.midi - b.midi),
    track: [...track].sort((a, b) => a.timeMs - b.timeMs),
  };
}

export function midiAxis(minMidi: number, maxMidi: number, padding = 1) {
  const low = Math.floor(Math.min(minMidi, maxMidi)) - padding;
  const high = Math.ceil(Math.max(minMidi, maxMidi)) + padding;
  const minimumWidth = 6;
  if (high - low >= minimumWidth) return { low, high };
  const extra = minimumWidth - (high - low);
  return { low: low - Math.floor(extra / 2), high: high + Math.ceil(extra / 2) };
}

export function axisTicks(low: number, high: number, maximum = 9) {
  const span = Math.max(1, high - low);
  const step = Math.max(1, Math.ceil(span / Math.max(1, maximum - 1)));
  const ticks: number[] = [];
  for (let value = low; value <= high; value += step) ticks.push(value);
  if (ticks.at(-1) !== high) ticks.push(high);
  return ticks;
}

export function midiPosition(midi: number, low: number, high: number) {
  if (high <= low) return 0;
  return Math.min(100, Math.max(0, ((midi - low) / (high - low)) * 100));
}

export function rangeChartData(profile: VocalRangeMetrics) {
  return [
    {
      key: "observed",
      label: "관측 음역",
      range: [profile.minMidi, profile.maxMidi] as [number, number],
      lowNote: midiToNoteName(profile.minMidi),
      highNote: midiToNoteName(profile.maxMidi),
    },
    {
      key: "tessitura",
      label: "주요 음역",
      range: [profile.tessituraLowMidi, profile.tessituraHighMidi] as [number, number],
      lowNote: midiToNoteName(profile.tessituraLowMidi),
      highNote: midiToNoteName(profile.tessituraHighMidi),
    },
  ];
}

export function histogramChartData(visualization: VocalProfileVisualization) {
  return visualization.histogram.map((bin) => ({
    ...bin,
    note: midiToNoteName(bin.midi),
    ratioPercent: bin.ratio * 100,
  }));
}

export function pitchChartData(visualization: VocalProfileVisualization) {
  return visualization.track.map((point) => ({
    ...point,
    timeSeconds: point.timeMs / 1_000,
    note: point.midi === null ? null : midiToNoteName(point.midi),
  }));
}
