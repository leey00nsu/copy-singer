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

test("login screen keeps only product branding and the Google start action", () => {
  const root = new URL("../", import.meta.url);
  const loginPage = readFileSync(new URL("src/_pages/login/ui/login-page.tsx", root), "utf8");
  const loginScreen = readFileSync(new URL("src/_pages/login/ui/login-screen.tsx", root), "utf8");
  const googleSignIn = readFileSync(new URL("src/features/authentication/ui/google-sign-in.tsx", root), "utf8");

  assert.match(loginPage, /safeCallbackURL/);
  assert.match(loginPage, /getRequestSession/);
  assert.match(loginPage, /<LoginScreen/);
  assert.match(loginScreen, /<ProductMark/);
  assert.match(loginScreen, />Copy Singer</);
  assert.match(loginScreen, /계속하려면 로그인하세요\./);
  assert.match(loginScreen, /Google 계정으로 로그인하면/);
  assert.match(loginScreen, /이용 약관/);
  assert.match(loginScreen, /개인정보 처리방침/);
  assert.doesNotMatch(loginScreen, /홈으로|Account|계정으로 시작하세요|현재는 Google 계정으로만/);
  assert.match(googleSignIn, /<GoogleIcon/);
  assert.match(googleSignIn, /구글로 시작하기/);
  assert.match(googleSignIn, /variant="outline"/);
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
    "app/(public)/terms/page.tsx",
    "app/(public)/privacy/page.tsx",
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

test("public legal pages and consent copy expose real document links", () => {
  const root = new URL("../", import.meta.url);
  const loginScreen = readFileSync(new URL("src/_pages/login/ui/login-screen.tsx", root), "utf8");
  const productShell = readFileSync(new URL("src/widgets/product-shell/ui/product-shell.tsx", root), "utf8");
  const terms = readFileSync(new URL("src/_pages/legal/ui/terms-page.tsx", root), "utf8");
  const privacy = readFileSync(new URL("src/_pages/legal/ui/privacy-page.tsx", root), "utf8");

  for (const source of [loginScreen, productShell]) {
    assert.match(source, /href="\/terms"/);
    assert.match(source, /href="\/privacy"/);
  }
  assert.match(terms, /음성·콘텐츠에 대한 권리와 책임/);
  assert.match(terms, /AI 결과의 한계/);
  assert.match(privacy, /Google 계정/);
  assert.match(privacy, /Leemage/);
  assert.match(privacy, /Modal \/ SoulX/);
  assert.match(privacy, /국외 이전 확인사항/);
  assert.match(privacy, /정식 공개 전 개인정보 보호책임자/);
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
