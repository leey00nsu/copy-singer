import assert from "node:assert/strict";
import test from "node:test";

import {
  createAdminSongSchema,
  replaceAdminSongSourceSchema,
  youtubeVideoIdFromUrl,
} from "../src/features/manage-song-catalog";

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

test("catalog manager exposes loading, empty, error, disabled, and mobile stories", async () => {
  const stories = await import("../src/features/manage-song-catalog/ui/catalog-manager.stories");
  assert.ok(stories.Default);
  assert.ok(stories.Empty);
  assert.ok(stories.AddAudioDialog);
  assert.ok(stories.ErrorAndRetry);
  assert.ok(stories.LoadingAndDisabled);
  assert.ok(stories.Mobile);
});

test("song management is an admin-only page with an explicit audio add entry point", async () => {
  const pageSource = await import("node:fs/promises").then((fs) =>
    fs.readFile("src/_pages/admin-song-catalog/ui/admin-song-catalog-page.tsx", "utf8"),
  );
  const managerSource = await import("node:fs/promises").then((fs) =>
    fs.readFile("src/features/manage-song-catalog/ui/catalog-manager.tsx", "utf8"),
  );
  assert.match(pageSource, /await requireAdminPage\(\)/);
  assert.match(pageSource, /title="음원 관리"/);
  assert.match(managerSource, /> 음원 추가/);
  assert.match(managerSource, /name="audio"/);
  assert.match(managerSource, /원키는 Modal 분석/);
  assert.doesNotMatch(managerSource, /name="originalKey"/);
  assert.doesNotMatch(managerSource, /name="sourceVideoId"/);
  assert.doesNotMatch(managerSource, /name="sourceLabel"/);
});
