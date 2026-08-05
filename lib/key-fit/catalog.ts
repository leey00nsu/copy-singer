import type { SongProfileArtifact } from "../song-catalog/artifact";
import type { SongCatalogEntry } from "../song-catalog/catalog";
import {
  KeyFitScoringError,
  type KeyFitProfile,
  type KeyFitScoreResult,
} from "./contract";
import { scoreKeyFit } from "./scorer";

export type CatalogKeyFitResult = SongCatalogEntry & KeyFitScoreResult;

export function scoreCatalogKeyFits(
  user: KeyFitProfile,
  artifact: SongProfileArtifact,
): CatalogKeyFitResult[] {
  return artifact.songs.map((song) => {
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
      ...scoreKeyFit(user, song.profile),
    };
  });
}
