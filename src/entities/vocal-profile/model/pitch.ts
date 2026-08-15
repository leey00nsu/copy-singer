const INTERNATIONAL_NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"] as const;
const KOREAN_NOTE_NAMES = ["도", "도♯", "레", "레♯", "미", "파", "파♯", "솔", "솔♯", "라", "라♯", "시"] as const;

function roundedPitch(midi: number) {
  const rounded = Math.round(midi);
  return {
    pitchClass: ((rounded % 12) + 12) % 12,
    octave: Math.floor(rounded / 12) - 1,
  };
}

export function midiToNoteName(midi: number) {
  const { pitchClass, octave } = roundedPitch(midi);
  return `${INTERNATIONAL_NOTE_NAMES[pitchClass]}${octave}`;
}

export function midiToKoreanNoteName(midi: number) {
  const { pitchClass, octave } = roundedPitch(midi);
  return `${KOREAN_NOTE_NAMES[pitchClass]}${octave}(${INTERNATIONAL_NOTE_NAMES[pitchClass]}${octave})`;
}
