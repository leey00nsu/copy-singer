import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { safeCallbackURL } from "../src/features/authentication/model/safe-callback-url";
import { isProductPathActive } from "../src/widgets/product-shell/model/product-navigation";

test("login callback accepts local paths and defaults to the product entry", () => {
  assert.equal(safeCallbackURL(undefined), "/profile");
  assert.equal(safeCallbackURL("/vocal-profiles?page=2"), "/vocal-profiles?page=2");
  assert.equal(safeCallbackURL(["/account", "/profile"]), "/account");
});

test("login callback rejects external and ambiguous destinations", () => {
  assert.equal(safeCallbackURL("https://example.com"), "/profile");
  assert.equal(safeCallbackURL("//example.com"), "/profile");
  assert.equal(safeCallbackURL("/\\example.com"), "/profile");
});

test("product navigation keeps saved resources and recommendation details under Library", () => {
  assert.equal(isProductPathActive("/profile", "/profile"), true);
  assert.equal(isProductPathActive("/library", "/library"), true);
  assert.equal(isProductPathActive("/vocal-profiles/voice-1", "/library"), true);
  assert.equal(isProductPathActive("/recommendations/run-1", "/library"), true);
  assert.equal(isProductPathActive("/mixing-history", "/library"), true);
  assert.equal(isProductPathActive("/profile", "/library"), false);
});

test("route groups preserve public URLs while the root layout stays shell-free", () => {
  const root = new URL("../", import.meta.url);
  for (const route of [
    "app/(public)/page.tsx",
    "app/(public)/login/page.tsx",
    "app/(product)/profile/page.tsx",
    "app/(product)/vocal-profiles/page.tsx",
    "app/(product)/mixing-history/page.tsx",
    "app/(product)/library/page.tsx",
    "app/(product)/account/page.tsx",
  ]) {
    assert.equal(existsSync(new URL(route, root)), true, `${route} should exist`);
  }
  assert.equal(existsSync(new URL("app/page.tsx", root)), false);
  assert.equal(existsSync(new URL("app/profile/page.tsx", root)), false);

  const rootLayout = readFileSync(new URL("src/_app/layout/root-layout.tsx", root), "utf8");
  assert.doesNotMatch(rootLayout, /UserMenu|getRequestSession/);
});
