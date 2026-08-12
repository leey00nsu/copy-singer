export type VocalProfileArtworkTokens = {
  backgroundColor: string;
  backgroundImage: string;
};

export type VocalProfileArtworkAnalysis = {
  maxMidi: number;
  medianMidi: number;
  minMidi: number;
  pitchStability: number;
  rmsDb: number;
  voicedRatio: number;
};

const ARTWORK_VERSION = 2;

function hashIdentity(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizedHue(value: number) {
  return Math.round((value + 360) % 360);
}

function scaled(value: number, inputMin: number, inputMax: number, outputMin: number, outputMax: number) {
  const progress = clamp((value - inputMin) / (inputMax - inputMin), 0, 1);
  return outputMin + progress * (outputMax - outputMin);
}

function finiteAnalysis(analysis?: Partial<VocalProfileArtworkAnalysis>): VocalProfileArtworkAnalysis | null {
  if (!analysis) return null;
  const values = [
    analysis.minMidi,
    analysis.maxMidi,
    analysis.medianMidi,
    analysis.pitchStability,
    analysis.voicedRatio,
    analysis.rmsDb,
  ];
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) return null;
  return analysis as VocalProfileArtworkAnalysis;
}

export function vocalProfileArtworkTokens(
  profileId: string,
  analysis?: Partial<VocalProfileArtworkAnalysis>,
): VocalProfileArtworkTokens {
  const seed = hashIdentity(`${ARTWORK_VERSION}:${profileId}`);
  const metrics = finiteAnalysis(analysis);
  const jitter = (seed % 29) - 14;
  const baseHue = metrics
    ? normalizedHue(scaled(metrics.medianMidi, 38, 82, 190, 520) + jitter)
    : normalizedHue(seed % 360);
  const range = metrics ? clamp(metrics.maxMidi - metrics.minMidi, 4, 36) : 18 + ((seed >>> 7) % 14);
  const hueSpread = Math.round(scaled(range, 4, 36, 34, 132));
  const accentHue = normalizedHue(baseHue + hueSpread);
  const thirdHue = normalizedHue(baseHue - hueSpread * 0.72);
  const saturation = metrics ? Math.round(scaled(metrics.pitchStability, 0.45, 0.98, 58, 88)) : 76;
  const baseLightness = metrics ? Math.round(scaled(metrics.voicedRatio, 0.35, 0.98, 29, 43)) : 36;
  const highlightLightness = metrics ? Math.round(scaled(metrics.rmsDb, -42, -8, 70, 88)) : 80;
  const x = 16 + ((seed >>> 5) % 69);
  const y = 12 + ((seed >>> 13) % 75);
  const angle = 96 + ((seed >>> 19) % 168);

  return {
    backgroundColor: `hsl(${baseHue} ${saturation}% ${baseLightness}%)`,
    backgroundImage: [
      `radial-gradient(circle at ${x}% ${y}%, hsl(${accentHue} ${Math.min(96, saturation + 8)}% ${highlightLightness}% / .96) 0%, transparent 46%)`,
      `radial-gradient(circle at ${100 - x}% ${100 - y}%, hsl(${thirdHue} ${Math.min(94, saturation + 4)}% ${Math.min(76, highlightLightness - 12)}% / .9) 0%, transparent 52%)`,
      `linear-gradient(${angle}deg, hsl(${baseHue} ${saturation}% ${Math.max(20, baseLightness - 10)}%), hsl(${accentHue} ${Math.min(94, saturation + 6)}% ${Math.min(68, baseLightness + 22)}%) 54%, hsl(${thirdHue} ${saturation}% ${Math.min(54, baseLightness + 8)}%))`,
    ].join(", "),
  };
}
