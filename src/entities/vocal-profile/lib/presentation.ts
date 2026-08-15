import { midiToKoreanNoteName } from "../model/pitch";

export type VocalProfilePresentationInput = {
  minMidi: number;
  maxMidi: number;
  medianMidi: number;
  tessituraLowMidi: number;
  tessituraHighMidi: number;
  voicedRatio: number;
  pitchStability: number;
  clippingRatio: number;
  rmsDb: number;
};

export type VocalProfileTrait = {
  id: "range" | "input";
  label: string;
  description: string;
};

export type VocalProfilePresentation = {
  label: string;
  summary: string;
  observedRange: { label: string; lowMidi: number; highMidi: number; semitones: number };
  practicalRange: { label: string; lowMidi: number; highMidi: number; semitones: number };
  median: { label: string; midi: number };
  voiced: { label: string; percent: number; description: string };
  stability: { label: string; percent: number };
  traits: VocalProfileTrait[];
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function ratio(value: number) {
  return Math.min(1, Math.max(0, finite(value, 0)));
}

function orderedRange(first: number, second: number, fallback: [number, number]) {
  const a = finite(first, fallback[0]);
  const b = finite(second, fallback[1]);
  return a <= b ? ([a, b] as const) : ([b, a] as const);
}

function noteRange(lowMidi: number, highMidi: number) {
  return `${midiToKoreanNoteName(lowMidi)}–${midiToKoreanNoteName(highMidi)}`;
}

export function presentVocalProfile(input: VocalProfilePresentationInput): VocalProfilePresentation {
  const [observedLow, observedHigh] = orderedRange(input.minMidi, input.maxMidi, [60, 60]);
  const [rawPracticalLow, rawPracticalHigh] = orderedRange(input.tessituraLowMidi, input.tessituraHighMidi, [
    observedLow,
    observedHigh,
  ]);
  const practicalLow = Math.max(observedLow, Math.min(observedHigh, rawPracticalLow));
  const practicalHigh = Math.max(practicalLow, Math.min(observedHigh, rawPracticalHigh));
  const medianMidi = Math.max(observedLow, Math.min(observedHigh, finite(input.medianMidi, practicalLow)));
  const observedSemitones = Math.max(0, observedHigh - observedLow);
  const practicalSemitones = Math.max(0, practicalHigh - practicalLow);
  const stability = ratio(input.pitchStability);
  const voiced = ratio(input.voicedRatio);

  const label =
    practicalSemitones >= 18
      ? "넓게 관찰된 주요 음역"
      : practicalSemitones >= 10
        ? "균형 있게 관찰된 주요 음역"
        : "집중되어 관찰된 주요 음역";

  const stabilityLabel =
    stability >= 0.85
      ? "안정적으로 관찰된 음정"
      : stability >= 0.65
        ? "변화가 있는 음정"
        : "변화 폭이 크게 관찰된 음정";

  const observedLabel = noteRange(observedLow, observedHigh);
  const practicalLabel = noteRange(practicalLow, practicalHigh);
  const medianLabel = midiToKoreanNoteName(medianMidi);
  const voicedPercent = Math.round(voiced * 100);
  const voicedDescription = `전체 녹음 중 음높이를 추적할 수 있었던 구간은 약 ${voicedPercent}%예요.`;

  return {
    label,
    summary: `이번 녹음에서는 ${practicalLabel} 구간의 음이 자주 관찰됐고, ${medianLabel} 부근에 음이 많이 모였어요.`,
    observedRange: { label: observedLabel, lowMidi: observedLow, highMidi: observedHigh, semitones: observedSemitones },
    practicalRange: {
      label: practicalLabel,
      lowMidi: practicalLow,
      highMidi: practicalHigh,
      semitones: practicalSemitones,
    },
    median: { label: medianLabel, midi: medianMidi },
    voiced: { label: "유효 음성 구간", percent: voicedPercent, description: voicedDescription },
    stability: { label: stabilityLabel, percent: Math.round(stability * 100) },
    traits: [
      {
        id: "range",
        label,
        description: "이번 녹음에서 자주 관찰된 음높이 구간이에요.",
      },
      {
        id: "input",
        label: "유효 음성 구간",
        description: voicedDescription,
      },
    ],
  };
}
