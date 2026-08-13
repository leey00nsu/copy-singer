import "server-only";

import { TJ_2607_CATALOG_SLUG } from "@/shared/config/index.server";
import type { Prisma, PrismaClient } from "@/shared/db/index.server";

export { TJ_2607_CATALOG_SLUG };

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

type BootstrapSong = {
  catalogOrder: number;
  title: string;
  artist: string;
  sourceUrl: string;
  sourceVideoId: string;
  sourceLabel: string;
  status: "PENDING" | "READY" | "FAILED";
  profile: {
    durationMs: number;
    sampleRate: number;
    sourceSizeBytes: number;
    minMidi: number;
    maxMidi: number;
    p10Midi: number;
    medianMidi: number;
    p90Midi: number;
    tessituraLowMidi: number;
    tessituraHighMidi: number;
    voicedRatio: number;
    pitchStability: number;
    clippingRatio: number;
    rmsDb: number;
    analyzer: string;
    analyzerVersion: string;
    descriptors: Record<string, unknown>;
    ytDlpVersion: string;
    separator: string;
    separatorVersion: string;
    separatorModel: string;
    cleanupConfirmed: true;
  } | null;
};

export type BootstrapSongCatalogArtifact = {
  catalog: { name: string; issue: string };
  pipelineContract: string;
  songs: BootstrapSong[];
};

function profileData(song: BootstrapSong) {
  if (song.status !== "READY" || !song.profile) {
    throw new Error(`Catalog song ${song.catalogOrder} does not have a READY profile.`);
  }
  const profile = song.profile;
  return {
    status: "READY" as const,
    durationMs: profile.durationMs,
    sampleRate: profile.sampleRate,
    sourceSizeBytes: BigInt(profile.sourceSizeBytes),
    minMidi: profile.minMidi,
    maxMidi: profile.maxMidi,
    p10Midi: profile.p10Midi,
    medianMidi: profile.medianMidi,
    p90Midi: profile.p90Midi,
    tessituraLowMidi: profile.tessituraLowMidi,
    tessituraHighMidi: profile.tessituraHighMidi,
    voicedRatio: profile.voicedRatio,
    pitchStability: profile.pitchStability,
    clippingRatio: profile.clippingRatio,
    rmsDb: profile.rmsDb,
    analyzer: profile.analyzer,
    analyzerVersion: profile.analyzerVersion,
    descriptors: profile.descriptors as Prisma.InputJsonValue,
    pipelineMetadata: {
      ytDlpVersion: profile.ytDlpVersion,
      separator: profile.separator,
      separatorVersion: profile.separatorVersion,
      separatorModel: profile.separatorModel,
    } satisfies Prisma.InputJsonValue,
    cleanupConfirmed: profile.cleanupConfirmed,
    errorCode: null,
    errorDetail: null,
    completedAt: new Date(),
  };
}

async function bootstrapEntry(
  tx: TransactionClient,
  catalogId: string,
  pipelineContract: string,
  entry: BootstrapSong,
) {
  const existing = await tx.song.findUnique({
    where: { title_artist: { title: entry.title, artist: entry.artist } },
    include: { targetAsset: true },
  });
  const song = await tx.song.upsert({
    where: { title_artist: { title: entry.title, artist: entry.artist } },
    create: {
      title: entry.title,
      artist: entry.artist,
      catalogOrder: entry.catalogOrder,
      lifecycleStatus: "DRAFT",
    },
    update: { catalogOrder: entry.catalogOrder },
  });

  const source = await tx.songSource.upsert({
    where: { sourceVideoId: entry.sourceVideoId },
    create: {
      songId: song.id,
      revision: 1,
      sourceUrl: entry.sourceUrl,
      sourceVideoId: entry.sourceVideoId,
      sourceLabel: entry.sourceLabel,
      status: "READY",
    },
    update: {
      songId: song.id,
      sourceUrl: entry.sourceUrl,
      sourceLabel: entry.sourceLabel,
      status: "READY",
    },
  });

  const analysis = await tx.songAnalysis.upsert({
    where: { sourceId_pipelineContract: { sourceId: source.id, pipelineContract } },
    create: {
      songId: song.id,
      sourceId: source.id,
      pipelineContract,
      ...profileData(entry),
    },
    update: profileData(entry),
  });

  const targetAsset = existing?.targetAsset;
  const targetReady = targetAsset?.status === "READY" && targetAsset.sourceVideoId === source.sourceVideoId;
  if (targetReady) {
    await tx.catalogTargetAsset.update({ where: { id: targetAsset.id }, data: { sourceId: source.id } });
  }
  const publishReady = analysis.status === "READY" && analysis.cleanupConfirmed && targetReady;

  await tx.catalogEntry.upsert({
    where: { catalogId_songId: { catalogId, songId: song.id } },
    create: {
      catalogId,
      songId: song.id,
      position: entry.catalogOrder,
      status: publishReady ? "PUBLISHED" : "DRAFT",
      publishedAt: publishReady ? new Date() : null,
    },
    update: {
      position: entry.catalogOrder,
      status: publishReady ? "PUBLISHED" : "DRAFT",
      publishedAt: publishReady ? new Date() : null,
    },
  });

  await tx.song.update({
    where: { id: song.id },
    data: {
      lifecycleStatus: publishReady ? "ACTIVE" : "DRAFT",
      activeSourceId: publishReady ? source.id : null,
      currentAnalysisId: publishReady ? analysis.id : null,
    },
  });
  return publishReady;
}

export async function bootstrapSongCatalog(prisma: PrismaClient, artifact: BootstrapSongCatalogArtifact) {
  if (!Array.isArray(artifact.songs) || artifact.songs.length === 0) {
    throw new Error("Song catalog bootstrap requires at least one song.");
  }

  return prisma.$transaction(async (tx) => {
    const catalog = await tx.catalog.upsert({
      where: { slug: TJ_2607_CATALOG_SLUG },
      create: {
        slug: TJ_2607_CATALOG_SLUG,
        name: artifact.catalog.name,
        issue: artifact.catalog.issue,
        status: "PUBLISHED",
      },
      update: {
        name: artifact.catalog.name,
        issue: artifact.catalog.issue,
        status: "PUBLISHED",
      },
    });

    let published = 0;
    for (const entry of artifact.songs) {
      if (await bootstrapEntry(tx, catalog.id, artifact.pipelineContract, entry)) published += 1;
    }

    return { catalogId: catalog.id, total: artifact.songs.length, published };
  });
}
