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

export function vocalProfileArtworkTokens(profileId: string): VocalProfileArtworkTokens {
  const seed = hashIdentity(profileId);
  const hue = seed % 360;
  const accentHue = (hue + 44 + ((seed >>> 8) % 74)) % 360;
  const thirdHue = (hue + 184 + ((seed >>> 16) % 48)) % 360;
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
