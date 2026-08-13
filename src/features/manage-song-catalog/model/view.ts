export type AdminCatalogSourceView = {
  id: string;
  revision: number;
  sourceUrl: string;
  sourceVideoId: string;
  sourceLabel: string;
  status: "DRAFT" | "READY" | "SUPERSEDED" | "UNAVAILABLE";
  analysisStatus: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | null;
  analysisError: string | null;
  analysisReady: boolean;
  estimatedKey: string | null;
  keyConfidence: number | null;
  targetReady: boolean;
};

export type AdminCatalogEntryView = {
  id: string;
  position: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  song: {
    id: string;
    title: string;
    artist: string;
    originalKey: string | null;
    lifecycleStatus: "DRAFT" | "ACTIVE" | "ARCHIVED";
    activeSourceId: string | null;
    currentAnalysisId: string | null;
    targetAssetId: string | null;
    sources: AdminCatalogSourceView[];
  };
};
