export type SongCatalogEntry = {
  catalogOrder: number;
  title: string;
  artist: string;
  sourceUrl: string;
  sourceVideoId: string;
  sourceLabel: string;
};

const ENTRY_PATTERN =
  /^(\d+)\. \*\*(.+?) — (.+?)\*\* · \[(.+?)\]\((https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11}))\)$/gm;

function duplicateValues<T>(values: T[]) {
  const seen = new Set<T>();
  const duplicates = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function parseSongCatalogMarkdown(markdown: string, expectedCount = 100): SongCatalogEntry[] {
  const entries = [...markdown.matchAll(ENTRY_PATTERN)].map((match) => ({
    catalogOrder: Number(match[1]),
    title: match[2]!.trim(),
    artist: match[3]!.trim(),
    sourceLabel: match[4]!.trim(),
    sourceUrl: match[5]!,
    sourceVideoId: match[6]!,
  }));

  if (entries.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} catalog entries, parsed ${entries.length}.`);
  }

  const invalidOrder = entries.find((entry, index) => entry.catalogOrder !== index + 1);
  if (invalidOrder) {
    throw new Error(`Catalog order must be continuous from 1; found ${invalidOrder.catalogOrder}.`);
  }

  const duplicateVideoIds = duplicateValues(entries.map((entry) => entry.sourceVideoId));
  if (duplicateVideoIds.length > 0) {
    throw new Error(`Duplicate YouTube video IDs: ${duplicateVideoIds.join(", ")}.`);
  }

  const duplicateSongs = duplicateValues(entries.map((entry) => `${entry.title}\u0000${entry.artist}`));
  if (duplicateSongs.length > 0) {
    throw new Error("Duplicate title/artist pairs are not allowed.");
  }

  return entries;
}

export const TJ_2607_CATALOG_METADATA = {
  name: "TJ Top 100",
  issue: "2026-07",
  sourceFile: "data/catalogs/tj-2607-top100.md",
} as const;
