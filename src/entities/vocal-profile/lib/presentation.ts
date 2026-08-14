import { midiToNoteName } from "../model/pitch";

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
  id: "range" | "stability" | "input";
  label: string;
  description: string;
};

export type VocalProfilePresentation = {
  label: string;
  summary: string;
  observedRange: { label: string; lowMidi: number; highMidi: number; semitones: number };
  practicalRange: { label: string; lowMidi: number; highMidi: number; semitones: number };
  median: { label: string; midi: number };
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
  return `${midiToNoteName(lowMidi)}–${midiToNoteName(highMidi)}`;
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
  const clipping = ratio(input.clippingRatio);
  const rmsDb = finite(input.rmsDb, Number.NEGATIVE_INFINITY);

  const label =
    practicalSemitones >= 18
      ? "넓게 관찰된 실용 음역"
      : practicalSemitones >= 10
        ? "균형 있게 관찰된 실용 음역"
        : "집중되어 관찰된 실용 음역";

  const stabilityLabel =
    stability >= 0.85
      ? "안정적으로 관찰된 음정"
      : stability >= 0.65
        ? "변화가 있는 음정"
        : "변화 폭이 크게 관찰된 음정";

  let inputLabel = "분석 가능한 음성 구간 확보";
  let inputDescription = `전체 녹음의 ${Math.round(voiced * 100)}%에서 음높이를 관찰했어요.`;
  if (!Number.isFinite(input.voicedRatio) || !Number.isFinite(input.clippingRatio) || !Number.isFinite(input.rmsDb)) {
    inputLabel = "분석 품질 확인 필요";
    inputDescription = "일부 품질 수치가 없어 상세 분석 값을 함께 확인해 주세요.";
  } else if (clipping >= 0.01) {
    inputLabel = "입력 피크 보완 권장";
    inputDescription = `녹음의 ${(clipping * 100).toFixed(1)}%에서 입력 한계에 가까운 신호가 관찰됐어요.`;
  } else if (rmsDb < -35) {
    inputLabel = "입력 음량 보완 권장";
    inputDescription = `평균 음량은 ${rmsDb.toFixed(1)} dB로 관찰됐어요.`;
  } else if (voiced < 0.45) {
    inputLabel = "노래 구간을 더 길게 권장";
    inputDescription = `전체 녹음의 ${Math.round(voiced * 100)}%에서 음높이를 관찰했어요.`;
  }

  const observedLabel = noteRange(observedLow, observedHigh);
  const practicalLabel = noteRange(practicalLow, practicalHigh);
  const medianLabel = midiToNoteName(medianMidi);

  return {
    label,
    summary: `이 녹음에서는 ${practicalLabel} 구간이 반복적으로 관찰됐고, 중심 음은 ${medianLabel}로 나타났어요.`,
    observedRange: { label: observedLabel, lowMidi: observedLow, highMidi: observedHigh, semitones: observedSemitones },
    practicalRange: {
      label: practicalLabel,
      lowMidi: practicalLow,
      highMidi: practicalHigh,
      semitones: practicalSemitones,
    },
    median: { label: medianLabel, midi: medianMidi },
    stability: { label: stabilityLabel, percent: Math.round(stability * 100) },
    traits: [
      {
        id: "range",
        label,
        description: `실용 음역 ${practicalLabel} · ${practicalSemitones.toFixed(1)} semitone`,
      },
      {
        id: "stability",
        label: stabilityLabel,
        description: `이 녹음에서 계산한 피치 안정도 ${Math.round(stability * 100)}%`,
      },
      { id: "input", label: inputLabel, description: inputDescription },
    ],
  };
}
