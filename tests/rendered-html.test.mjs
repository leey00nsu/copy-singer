import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Copy Singer workbench", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Copy Singer/);
  assert.match(html, /Weave a new voice into/);
  assert.match(html, /Reference voice/);
  assert.match(html, /Target performance/);
  assert.match(html, /Advanced settings/);
  assert.match(html, /Generated vocal/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("server-renders the guided vocal profile page", async () => {
  const response = await render("/profile");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /내 음역 측정/);
  assert.match(html, /편한 시작 키 선택/);
  assert.match(html, /마이크로 녹음/);
  assert.match(html, /오디오 파일 업로드/);
});
