import type { KeyFitProfile, KeyFitScoreResult } from "../model/key-fit-contract";
import { KeyFitScoringError } from "../model/key-fit-contract";
import { scoreKeyFit } from "./key-fit-scorer";
import type { SongProfileArtifact } from "./song-catalog/artifact";
import type { SongCatalogEntry } from "./song-catalog/catalog";

export type CatalogKeyFitResult = SongCatalogEntry & KeyFitScoreResult;

export type CatalogProfileEntry = SongCatalogEntry & { profile: KeyFitProfile };

export function scoreCatalogProfiles(user: KeyFitProfile, entries: readonly CatalogProfileEntry[]) {
  return entries.map(({ profile, ...song }) => ({
    ...song,
    ...scoreKeyFit(user, profile),
  }));
}

export function scoreCatalogKeyFits(user: KeyFitProfile, artifact: SongProfileArtifact): CatalogKeyFitResult[] {
  const entries = artifact.songs.map((song) => {
    if (song.status !== "READY" || !song.profile) {
      throw new KeyFitScoringError(
        "SONG_PROFILE_NOT_READY",
        `Song profile at catalog order ${song.catalogOrder} is not ready.`,
        {
          catalogOrder: song.catalogOrder,
          status: song.status,
        },
      );
    }

    return {
      catalogOrder: song.catalogOrder,
      title: song.title,
      artist: song.artist,
      sourceLabel: song.sourceLabel,
      sourceUrl: song.sourceUrl,
      sourceVideoId: song.sourceVideoId,
      profile: song.profile,
    };
  });
  return scoreCatalogProfiles(user, entries);
}
