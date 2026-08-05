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

test("server-renders the developer Copy Singer workbench", async () => {
  const response = await render("/dev/svc");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>SVC 개발 Workbench/);
  assert.match(html, /Weave a new voice into/);
  assert.match(html, /Reference voice/);
  assert.match(html, /Target performance/);
  assert.match(html, /Advanced settings/);
  assert.match(html, /Generated vocal/);
  assert.match(html, /개발용 SVC Workbench/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("uses the vocal profile flow as the product home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /내 음역 측정/);
  assert.doesNotMatch(html, /Advanced settings/);
});

test("server-renders the free-singing vocal profile page", async () => {
  const response = await render("/profile");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /내 음역 측정/);
  assert.match(html, /가볍게 노래 한 소절을 불러주세요/);
  assert.match(html, /10–30초/);
  assert.match(html, /마이크로 녹음/);
  assert.match(html, /오디오 파일 업로드/);
});
