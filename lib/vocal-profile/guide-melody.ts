export const GUIDE_PATTERN = [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0] as const;
export const GUIDE_NOTE_DURATION_MS = 750;
export const GUIDE_MELODY_DURATION_MS = GUIDE_PATTERN.length * GUIDE_NOTE_DURATION_MS;
export const GUIDE_TRANSITION_DURATION_MS = 1500;
export const GUIDE_GLISSANDO_DURATION_MS = 7500;
export const GUIDE_RECORDING_DURATION_MS =
  GUIDE_MELODY_DURATION_MS + GUIDE_TRANSITION_DURATION_MS + GUIDE_GLISSANDO_DURATION_MS;
export const GUIDE_COUNT_IN_MS = 3000;

export const GUIDE_PRESETS = {
  low: { label: "낮게", range: "C3–A3", startMidi: 48 },
  medium: { label: "보통", range: "G3–E4", startMidi: 55 },
  high: { label: "높게", range: "C4–A4", startMidi: 60 },
} as const;

export type GuidePreset = keyof typeof GUIDE_PRESETS;

export function midiToFrequency(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function midiToNoteName(midi: number) {
  const rounded = Math.round(midi);
  const notes = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  return `${notes[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

export function guideMidiNotes(preset: GuidePreset) {
  const startMidi = GUIDE_PRESETS[preset].startMidi;
  return GUIDE_PATTERN.map((interval) => startMidi + interval);
}

export function guideFormFields(preset: GuidePreset) {
  return {
    preset,
    melody_start_ms: "0",
    melody_end_ms: String(GUIDE_MELODY_DURATION_MS),
    glissando_start_ms: String(GUIDE_MELODY_DURATION_MS + GUIDE_TRANSITION_DURATION_MS),
    glissando_end_ms: String(GUIDE_RECORDING_DURATION_MS),
  };
}

function playOscillatorGuide(preset: GuidePreset) {
  const context = new AudioContext();
  const notes = guideMidiNotes(preset);
  const startAt = context.currentTime + 0.08;
  const oscillators: OscillatorNode[] = [];

  notes.forEach((midi, index) => {
    const noteStart = startAt + (index * GUIDE_NOTE_DURATION_MS) / 1000;
    const noteEnd = noteStart + GUIDE_NOTE_DURATION_MS / 1000;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = midiToFrequency(midi);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.16, noteStart + 0.025);
    gain.gain.setValueAtTime(0.16, Math.max(noteStart + 0.03, noteEnd - 0.05));
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd);
    oscillators.push(oscillator);
  });

  const finished = new Promise<void>((resolve) => {
    window.setTimeout(() => {
      void context.close();
      resolve();
    }, GUIDE_MELODY_DURATION_MS + 180);
  });

  return {
    finished,
    stop: () => {
      oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // The oscillator may already be stopped.
        }
      });
      void context.close();
    },
  };
}

export function playGuideMelody(preset: GuidePreset) {
  const audio = new Audio(`/audio/guides/humming-${preset}.wav`);
  let stopped = false;
  let fallback: ReturnType<typeof playOscillatorGuide> | null = null;
  const finished = (async () => {
    try {
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener("ended", () => resolve(), { once: true });
        audio.addEventListener("error", () => reject(new Error("Guide asset failed to load")), { once: true });
      });
    } catch {
      if (stopped) return;
      fallback = playOscillatorGuide(preset);
      await fallback.finished;
    }
  })();

  return {
    finished,
    stop: () => {
      stopped = true;
      audio.pause();
      audio.currentTime = 0;
      fallback?.stop();
    },
  };
}
