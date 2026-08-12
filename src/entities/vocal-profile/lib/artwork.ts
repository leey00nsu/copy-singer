export type VocalProfileArtworkTokens = {
  backgroundColor: string;
  backgroundImage: string;
};

function hashIdentity(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const brandHueFamilies = [
  { accent: 294, base: 258, third: 330 },
  { accent: 274, base: 224, third: 318 },
  { accent: 324, base: 282, third: 246 },
  { accent: 252, base: 210, third: 302 },
] as const;

function normalizedHue(value: number) {
  return (value + 360) % 360;
}

export function vocalProfileArtworkTokens(profileId: string): VocalProfileArtworkTokens {
  const seed = hashIdentity(profileId);
  const family = brandHueFamilies[seed % brandHueFamilies.length] ?? brandHueFamilies[0];
  const variation = ((seed >>> 8) % 17) - 8;
  const hue = normalizedHue(family.base + variation);
  const accentHue = normalizedHue(family.accent - Math.round(variation * 0.5));
  const thirdHue = normalizedHue(family.third + Math.round(variation * 0.75));
  const x = 18 + ((seed >>> 5) % 65);
  const y = 14 + ((seed >>> 13) % 68);
  const angle = 105 + ((seed >>> 19) % 130);

  return {
    backgroundColor: `hsl(${hue} 72% 42%)`,
    backgroundImage: [
      `radial-gradient(circle at ${x}% ${y}%, hsl(${accentHue} 92% 80% / .96) 0%, transparent 46%)`,
      `radial-gradient(circle at ${100 - x}% ${100 - y}%, hsl(${thirdHue} 90% 63% / .9) 0%, transparent 52%)`,
      `linear-gradient(${angle}deg, hsl(${hue} 72% 27%), hsl(${accentHue} 82% 55%) 54%, hsl(${thirdHue} 78% 42%))`,
    ].join(", "),
  };
}
