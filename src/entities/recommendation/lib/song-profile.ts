import type { RecommendationSongProfile } from "../model/contract";

type StoredSongProfile = {
  sourceType: string;
  minMidi: number | null;
  maxMidi: number | null;
  medianMidi: number | null;
  tessituraLowMidi: number | null;
  tessituraHighMidi: number | null;
};

export function projectRecommendationSongProfile(
  profile: StoredSongProfile | null | undefined,
): RecommendationSongProfile | null {
  if (profile?.sourceType !== "SONG") return null;

  const values = [
    profile.minMidi,
    profile.maxMidi,
    profile.medianMidi,
    profile.tessituraLowMidi,
    profile.tessituraHighMidi,
  ];
  if (values.some((value) => value === null || !Number.isFinite(value))) return null;

  const result = {
    minMidi: profile.minMidi as number,
    maxMidi: profile.maxMidi as number,
    medianMidi: profile.medianMidi as number,
    tessituraLowMidi: profile.tessituraLowMidi as number,
    tessituraHighMidi: profile.tessituraHighMidi as number,
  };
  if (
    result.minMidi > result.maxMidi ||
    result.tessituraLowMidi > result.tessituraHighMidi ||
    result.tessituraLowMidi < result.minMidi ||
    result.medianMidi < result.tessituraLowMidi ||
    result.medianMidi > result.tessituraHighMidi ||
    result.tessituraHighMidi > result.maxMidi
  ) {
    return null;
  }
  return result;
}
