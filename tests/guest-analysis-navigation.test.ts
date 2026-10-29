import assert from "node:assert/strict";
import test from "node:test";
import { guestRecommendationReturn, guestRecommendationSaveHref } from "../src/entities/guest-analysis/index.model";

const profile = "20000000-0000-4000-8000-000000000001";
const song = "20000000-0000-4000-8000-000000000003";

test("login callback preserves the selected song through profile saving", () => {
  const href = new URL(guestRecommendationSaveHref(profile, song), "https://app.example");
  assert.equal(href.pathname, "/login");
  const callback = new URL(href.searchParams.get("callbackURL")!, "https://app.example");
  assert.equal(callback.pathname, "/profile/save-trial");
  assert.equal(callback.searchParams.get("next"), `/recommendations/${profile}/songs/${song}`);
  assert.equal(
    guestRecommendationReturn(profile, callback.searchParams.get("next")!),
    `/recommendations/${profile}/songs/${song}`,
  );
  assert.equal(guestRecommendationSaveHref(profile, song, true), callback.pathname + callback.search);
  assert.equal(guestRecommendationReturn(profile, `/recommendations/${profile}`), `/recommendations/${profile}`);
});

test("saving rejects external, recursive, encoded, other-profile and malformed return destinations", () => {
  for (const candidate of [
    undefined,
    "https://evil.example",
    "//evil.example",
    "/profile/save-trial",
    `/recommendations/${song}`,
    `/recommendations/${profile}/songs/no-id`,
    `/recommendations/${profile}?next=https://evil.example`,
    `/recommendations/${profile}/../${song}`,
    `/recommendations/${profile}\n`,
    `/recommendations/${profile}%2fsongs%2f${song}`,
    `/recommendations/${profile}#fragment`,
    "javascript:alert(1)",
  ]) {
    assert.equal(guestRecommendationReturn(profile, candidate), `/vocal-profiles/${profile}`, String(candidate));
  }
});
