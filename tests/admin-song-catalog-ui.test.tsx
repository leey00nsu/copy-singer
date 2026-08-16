import assert from "node:assert/strict";
import test from "node:test";

import {
  type AdminCatalogEntryView,
  createAdminSongSchema,
  presentAdminCatalogSources,
  replaceAdminSongSourceSchema,
  youtubeVideoIdFromUrl,
} from "../src/features/manage-song-catalog";

function catalogEntryFixture(): AdminCatalogEntryView {
  return {
    id: "entry-1",
    position: 1,
    status: "PUBLISHED",
    song: {
      id: "song-1",
      title: "새 노래",
      artist: "새 가수",
      originalKey: "C",
      lifecycleStatus: "ACTIVE",
      activeSourceId: "source-2",
      currentAnalysisId: "analysis-2",
      targetAssetId: "target-2",
      sources: [
        {
          id: "source-1",
          revision: 1,
          sourceUrl: "https://youtu.be/abcdefghijk",
          sourceVideoId: "abcdefghijk",
          sourceLabel: "관리자 업로드",
          status: "SUPERSEDED",
          analysisStatus: "SUCCEEDED",
          analysisError: null,
          analysisReady: true,
          estimatedKey: "C",
          keyConfidence: 0.9,
          targetReady: true,
        },
        {
          id: "source-3",
          revision: 3,
          sourceUrl: "https://youtu.be/lmnopqrstuv",
          sourceVideoId: "lmnopqrstuv",
          sourceLabel: "관리자 교체 업로드",
          status: "DRAFT",
          analysisStatus: "PENDING",
          analysisError: null,
          analysisReady: false,
          estimatedKey: null,
          keyConfidence: null,
          targetReady: false,
        },
        {
          id: "source-2",
          revision: 2,
          sourceUrl: "https://youtu.be/ABCDEFGHIJK",
          sourceVideoId: "ABCDEFGHIJK",
          sourceLabel: "관리자 교체 업로드",
          status: "READY",
          analysisStatus: "SUCCEEDED",
          analysisError: null,
          analysisReady: true,
          estimatedKey: "C",
          keyConfidence: 0.95,
          targetReady: true,
        },
      ],
    },
  };
}

test("admin song form derives its video ID and source label from a YouTube URL", () => {
  const valid = createAdminSongSchema.safeParse({
    title: "새 노래",
    artist: "새 가수",
    sourceUrl: "https://youtu.be/abcdefghijk",
    idempotencyKey: "request-1",
  });
  assert.equal(valid.success, true);
  if (!valid.success) return;
  assert.equal(valid.data.sourceVideoId, "abcdefghijk");
  assert.equal(valid.data.sourceLabel, "관리자 업로드");
  const invalid = replaceAdminSongSourceSchema.safeParse({
    sourceUrl: "https://example.com/watch?v=abcdefghijk",
    idempotencyKey: "request-2",
  });
  assert.equal(invalid.success, false);
  assert.equal(youtubeVideoIdFromUrl("https://www.youtube.com/watch?v=ABCDEFGHIJK"), "ABCDEFGHIJK");
  assert.equal(youtubeVideoIdFromUrl("https://music.youtube.com/watch?v=abcdefghijk"), "abcdefghijk");
  assert.equal(youtubeVideoIdFromUrl("https://youtube.com/shorts/12345678901"), "12345678901");
});

test("catalog source presentation separates current, pending, and historical versions without raw states", () => {
  const entry = catalogEntryFixture();
  const versions = presentAdminCatalogSources(entry);
  assert.deepEqual(
    versions.map((version) => [version.source.id, version.role, version.stateLabel]),
    [
      ["source-3", "pending", "원곡 파일 필요"],
      ["source-2", "current", "추천에 공개 중"],
      ["source-1", "history", "이전 버전"],
    ],
  );
  assert.equal(versions[0]?.needsOriginalFileRecovery, true);
  assert.equal(versions[0]?.canPublish, false);
  assert.match(versions[0]?.publishBlockedReason ?? "", /원곡 음원 파일/);
  assert.equal(versions[1]?.canPublish, true);
  assert.doesNotMatch(
    versions.map((version) => `${version.roleLabel} ${version.stateLabel} ${version.stateDescription}`).join(" "),
    /target ready|SUPERSEDED|SUCCEEDED/,
  );
});

test("catalog source presentation explains archived current data and retryable analysis", () => {
  const archived = catalogEntryFixture();
  archived.song.lifecycleStatus = "ARCHIVED";
  archived.status = "ARCHIVED";
  const current = presentAdminCatalogSources(archived).find((version) => version.role === "current");
  assert.equal(current?.stateLabel, "보관됨");
  assert.match(current?.stateDescription ?? "", /원곡 파일은 유지/);

  archived.song.sources[0] = {
    ...archived.song.sources[0],
    id: "source-4",
    revision: 4,
    status: "DRAFT",
    analysisStatus: "FAILED",
    analysisReady: false,
  };
  const failed = presentAdminCatalogSources(archived)[0];
  assert.equal(failed?.stateLabel, "분석 실패");
  assert.equal(failed?.canRetryAnalysis, true);
  assert.match(failed?.publishBlockedReason ?? "", /다시 시도/);
});

test("catalog manager exposes loading, empty, error, disabled, and mobile stories", async () => {
  const stories = await import("../src/features/manage-song-catalog/ui/catalog-manager.stories");
  assert.ok(stories.Default);
  assert.ok(stories.Empty);
  assert.ok(stories.AddAudioDialog);
  assert.ok(stories.ErrorAndRetry);
  assert.ok(stories.ArchiveExplanation);
  assert.ok(stories.ArchivedAndRestorable);
  assert.ok(stories.LoadingAndDisabled);
  assert.ok(stories.Mobile);
});

test("song management is an admin-only page with one explicit original-song file entry point", async () => {
  const pageSource = await import("node:fs/promises").then((fs) =>
    fs.readFile("src/_pages/admin-song-catalog/ui/admin-song-catalog-page.tsx", "utf8"),
  );
  const managerSource = await import("node:fs/promises").then((fs) =>
    fs.readFile("src/features/manage-song-catalog/ui/catalog-manager.tsx", "utf8"),
  );
  assert.match(pageSource, /await requireAdminPage\(\)/);
  assert.match(pageSource, /title="추천곡 관리"/);
  assert.match(managerSource, /> 추천곡 추가/);
  assert.match(managerSource, /name="audio"/);
  assert.match(managerSource, /원곡 파일 하나만 필요해요/);
  assert.match(managerSource, /보컬과 반주가 함께 있는 원곡/);
  assert.match(managerSource, /YouTube 미리듣기 영상/);
  assert.match(managerSource, /원곡 파일 다시 업로드/);
  assert.doesNotMatch(managerSource, /믹싱 target 음원|교체 음원/);
  assert.doesNotMatch(managerSource, /window\.confirm|영구 삭제/);
  assert.match(managerSource, /기존 믹싱[\s\S]*이력은[\s\S]*삭제하지 않고 보관/);
  assert.match(managerSource, /추천에 다시 공개/);
  assert.doesNotMatch(managerSource, /name="originalKey"/);
  assert.doesNotMatch(managerSource, /name="sourceVideoId"/);
  assert.doesNotMatch(managerSource, /name="sourceLabel"/);
});
