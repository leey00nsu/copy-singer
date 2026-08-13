export type SongCatalogEntry = {
  catalogOrder: number;
  title: string;
  artist: string;
  sourceUrl: string;
  sourceVideoId: string;
  sourceLabel: string;
};

export const TJ_2607_CATALOG_METADATA = {
  name: "TJ Top 100",
  issue: "2026-07",
  source: "admin-catalog-snapshot",
} as const;
