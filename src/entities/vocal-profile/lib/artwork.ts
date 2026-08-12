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

const ARTWORK_VERSION = 3;

type AuroraFamily = {
  accent: readonly [hue: number, saturation: number, lightness: number];
  base: readonly [hue: number, saturation: number, lightness: number];
  deep: readonly [hue: number, saturation: number, lightness: number];
};

// Restrained analogous ramps derived from Aurora Gradient Generator presets.
// Each artwork stays inside one family instead of mixing distant hues.
const AURORA_FAMILIES: readonly AuroraFamily[] = [
  {
    deep: [343, 75, 20],
    base: [343, 79, 36],
    accent: [349, 88, 65],
  },
  {
    deep: [155, 43, 18],
    base: [153, 39, 41],
    accent: [150, 42, 62],
  },
  {
    deep: [214, 82, 27],
    base: [201, 78, 36],
    accent: [190, 75, 75],
  },
  {
    deep: [243, 22, 35],
    base: [200, 47, 45],
    accent: [181, 59, 70],
  },
];

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

function mix(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
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
  const familyIndex = metrics
    ? Math.min(AURORA_FAMILIES.length - 1, Math.floor(scaled(metrics.medianMidi, 38, 82, 0, AURORA_FAMILIES.length)))
    : seed % AURORA_FAMILIES.length;
  const family = AURORA_FAMILIES[familyIndex];
  const jitter = (seed % 7) - 3;
  const range = metrics ? clamp(metrics.maxMidi - metrics.minMidi, 4, 36) : 18 + ((seed >>> 7) % 14);
  const familySpread = scaled(range, 4, 36, 0.32, 1);
  const baseHue = normalizedHue(family.base[0] + jitter);
  const accentHue = normalizedHue(mix(family.base[0], family.accent[0], familySpread) + jitter);
  const deepHue = normalizedHue(mix(family.base[0], family.deep[0], familySpread) + jitter);
  const stabilityShift = metrics ? scaled(metrics.pitchStability, 0.45, 0.98, -7, 5) : 0;
  const saturation = Math.round(clamp(family.base[1] + stabilityShift, 34, 82));
  const accentSaturation = Math.round(clamp(family.accent[1] + stabilityShift * 0.7, 38, 88));
  const deepSaturation = Math.round(clamp(family.deep[1] + stabilityShift * 0.5, 24, 80));
  const voiceLightnessShift = metrics ? scaled(metrics.voicedRatio, 0.35, 0.98, -4, 5) : 0;
  const energyLightnessShift = metrics ? scaled(metrics.rmsDb, -42, -8, -6, 4) : 0;
  const baseLightness = Math.round(clamp(family.base[2] + voiceLightnessShift, 24, 52));
  const highlightLightness = Math.round(clamp(family.accent[2] + energyLightnessShift, 54, 82));
  const deepLightness = Math.round(clamp(family.deep[2] + voiceLightnessShift * 0.5, 16, 38));
  const x = 16 + ((seed >>> 5) % 69);
  const y = 12 + ((seed >>> 13) % 75);
  const angle = 96 + ((seed >>> 19) % 168);

  return {
    backgroundColor: `hsl(${baseHue} ${saturation}% ${baseLightness}%)`,
    backgroundImage: [
      `radial-gradient(circle at ${x}% ${y}%, hsl(${accentHue} ${accentSaturation}% ${highlightLightness}% / .9) 0%, transparent 48%)`,
      `radial-gradient(circle at ${100 - x}% ${100 - y}%, hsl(${baseHue} ${saturation}% ${Math.min(68, baseLightness + 15)}% / .72) 0%, transparent 54%)`,
      `linear-gradient(${angle}deg, hsl(${deepHue} ${deepSaturation}% ${deepLightness}%), hsl(${baseHue} ${saturation}% ${baseLightness}%) 56%, hsl(${accentHue} ${accentSaturation}% ${Math.min(72, highlightLightness - 8)}%))`,
    ].join(", "),
  };
}
