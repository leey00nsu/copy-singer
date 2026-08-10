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
  assert.equal(isProductPathActive("/account", "/account"), true);
  assert.equal(isProductPathActive("/library", "/account"), false);
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
    "app/(product)/loading.tsx",
    "app/(product)/error.tsx",
    "app/(product)/not-found.tsx",
  ]) {
    assert.equal(existsSync(new URL(route, root)), true, `${route} should exist`);
  }
  assert.equal(existsSync(new URL("app/page.tsx", root)), false);
  assert.equal(existsSync(new URL("app/profile/page.tsx", root)), false);

  const rootLayout = readFileSync(new URL("src/_app/layout/root-layout.tsx", root), "utf8");
  assert.doesNotMatch(rootLayout, /UserMenu|getRequestSession/);
  for (const state of ["loading.tsx", "error.tsx", "not-found.tsx"]) {
    const adapter = readFileSync(new URL(`app/(product)/${state}`, root), "utf8");
    assert.match(adapter, /@\/_app\/layout/);
    assert.doesNotMatch(adapter, /<main|<section|className=/);
  }
});

test("product shell keeps keyboard, touch-target, and navigation labels explicit", () => {
  const root = new URL("../", import.meta.url);
  const shell = readFileSync(new URL("src/widgets/product-shell/ui/product-shell.tsx", root), "utf8");

  assert.match(shell, /본문 바로가기/);
  assert.match(shell, /href="#product-content"/);
  assert.match(shell, /focus-visible:ring/);
  assert.match(shell, /min-h-11/);
  assert.match(shell, /aria-label="제품 메뉴"/);
  assert.match(shell, /aria-label="제품 메뉴 열기"/);
  assert.match(shell, /<header className="sticky top-0/);
  assert.match(shell, /developmentBypass/);
  assert.doesNotMatch(shell, /<aside/);

  const userMenu = readFileSync(new URL("src/features/authentication/ui/user-menu.tsx", root), "utf8");
  assert.match(userMenu, /router\.replace\("\/"\)/);
  assert.match(userMenu, /router\.refresh\(\)/);
  assert.match(userMenu, /개발 인증 우회 사용 중/);
});
