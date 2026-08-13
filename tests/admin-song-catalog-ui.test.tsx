import assert from "node:assert/strict";
import test from "node:test";

import { createAdminSongSchema, replaceAdminSongSourceSchema } from "../src/features/manage-song-catalog";

test("admin song form contract requires a matching YouTube URL and video ID", () => {
  const valid = createAdminSongSchema.safeParse({
    title: "새 노래",
    artist: "새 가수",
    sourceUrl: "https://youtu.be/abcdefghijk",
    sourceVideoId: "abcdefghijk",
    sourceLabel: "공식 영상",
    idempotencyKey: "request-1",
  });
  assert.equal(valid.success, true);
  const mismatched = replaceAdminSongSourceSchema.safeParse({
    sourceUrl: "https://youtu.be/abcdefghijk",
    sourceVideoId: "ABCDEFGHIJK",
    sourceLabel: "잘못된 입력",
    idempotencyKey: "request-2",
  });
  assert.equal(mismatched.success, false);
});

test("catalog manager exposes loading, empty, error, disabled, and mobile stories", async () => {
  const stories = await import("../src/features/manage-song-catalog/ui/catalog-manager.stories");
  assert.ok(stories.Default);
  assert.ok(stories.Empty);
  assert.ok(stories.ErrorAndRetry);
  assert.ok(stories.LoadingAndDisabled);
  assert.ok(stories.Mobile);
});
