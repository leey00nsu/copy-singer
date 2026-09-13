import { readFileSync } from "node:fs";
import { expect, test } from "playwright/test";
import { wav } from "./provider.mjs";

const accounts = JSON.parse(readFileSync(process.env.E2E_ACCOUNTS, "utf8"));
async function session(context, name) {
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: accounts[name].cookie,
      url: process.env.E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}
async function balance(request, kind) {
  const response = await request.get("/api/account/ticket-balance");
  expect(response.status()).toBe(200);
  return (await response.json()).wallets.find((w) => w.kind === kind).balance;
}
async function upload(page) {
  await page.goto("/profile");
  // The ticket policy is rendered after the client query mounts; avoid sending a file event to unhydrated SSR HTML.
  await expect(page.getByRole("region", { name: "내 목소리 들려주기" }).getByText(/^\d+장$/)).toBeVisible();
  await page
    .getByLabel("녹음 파일로 분석하기")
    .setInputFiles({ name: "fixture.wav", mimeType: "audio/wav", buffer: wav() });
  await expect(page.getByText("분석할 오디오가 준비됐어요", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "내 보컬 프로필 만들기", exact: true }).click();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/vocal-profile-analysis-jobs") && r.request().method() === "POST",
  );
  await page.getByRole("dialog").getByRole("button", { name: "분석 시작", exact: true }).click();
  expect((await response).status()).toBe(202);
}
test.beforeEach(async ({ context }) => {
  // Product APIs remain real. Only browser requests outside the local test environment are blocked.
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" || url.protocol === "data:" || url.protocol === "blob:"
      ? route.continue()
      : route.abort();
  });
});
test("authenticated upload → analysis → recommendation → mixing → playback → history/delete → logout", async ({
  page,
  context,
  browser,
}) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByRole("button", { name: "구글로 시작하기" })).toBeVisible();
  expect((await context.request.get("/api/vocal-profiles")).status()).toBe(401);
  await session(context, "owner");
  expect(await balance(context.request, "VOCAL_ANALYSIS")).toBe(5);
  await upload(page);
  await expect(page).toHaveURL(/\/vocal-profiles\/[a-f0-9-]+$/, { timeout: 45000 });
  const profileUrl = page.url(),
    profileId = profileUrl.split("/").at(-1);
  await expect(page.getByRole("button", { name: "이름 변경", exact: true })).toBeVisible();
  expect(await balance(context.request, "VOCAL_ANALYSIS")).toBe(4);
  await page.getByRole("button", { name: "이름 변경", exact: true }).click();
  await page.getByRole("dialog").getByLabel("프로필 이름", { exact: true }).fill("E2E 보컬");
  await page.getByRole("dialog").getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "E2E 보컬", exact: true })).toBeVisible();
  const other = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
  try {
    await session(other, "other");
    for (const suffix of ["", "/audio"])
      expect((await other.request.get(`/api/vocal-profiles/${profileId}${suffix}`)).status()).toBe(404);
    expect(
      (await other.request.patch(`/api/vocal-profiles/${profileId}`, { data: { displayName: "stolen" } })).status(),
    ).toBe(404);
    expect((await other.request.delete(`/api/vocal-profiles/${profileId}`)).status()).toBe(404);
  } finally {
    await other.close();
  }
  await page.getByRole("link", { name: "추천 결과 보기", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/recommendations/${profileId}`));
  await page.getByRole("button", { name: "이 곡으로 AI 믹싱", exact: true }).first().click();
  const submitted = page.waitForResponse(
    (r) => r.url().endsWith("/api/mixing-jobs") && r.request().method() === "POST",
  );
  await page.getByRole("dialog").getByRole("button", { name: "AI 믹싱 시작", exact: true }).click();
  const response = await submitted;
  expect(response.status()).toBe(202);
  await expect(page).toHaveURL(/\/library\/mixes\/[a-f0-9-]+$/);
  const mixUrl = page.url(),
    mixId = mixUrl.split("/").at(-1);
  const play = page.getByRole("button", { name: /AI 믹싱 결과 재생$/, exact: false });
  await expect(play).toBeEnabled({ timeout: 45000 });
  expect(await balance(context.request, "AI_MIXING")).toBe(4);
  const audio = await context.request.get(`/api/mixing-jobs/${mixId}/audio`, { headers: { Range: "bytes=0-99" } });
  expect(audio.status()).toBe(206);
  expect((await audio.body()).length).toBe(100);
  await play.click();
  await expect(page.getByRole("button", { name: /AI 믹싱 결과 일시정지$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /AI 믹싱 결과 재생$/ })).toBeVisible();
  await page.goto("/library?tab=mixes");
  await expect(page.locator(`a[href="/library/mixes/${mixId}"]`).first()).toBeVisible();
  await page.goto(mixUrl);
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "AI 믹스 삭제", exact: true }).click();
  await expect(page).toHaveURL(/\/library\?tab=mixes/);
  expect((await context.request.get(`/api/mixing-jobs/${mixId}`)).status()).toBe(404);
  expect(await balance(context.request, "AI_MIXING")).toBe(4);
  await page.goto(profileUrl);
  await page.getByRole("button", { name: "삭제", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "프로필 삭제", exact: true }).click();
  await expect(page).toHaveURL(/\/library\?tab=profiles/);
  expect((await context.request.get(`/api/vocal-profiles/${profileId}`)).status()).toBe(404);
  await page
    .getByRole("button", { name: /E2E owner/ })
    .first()
    .click();
  const signedOut = page.waitForResponse(
    (r) => r.url().endsWith("/api/auth/sign-out") && r.request().method() === "POST",
  );
  await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
  expect((await signedOut).status()).toBe(200);
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login\?/);
  expect((await context.request.get("/api/account/ticket-balance")).status()).toBe(401);
});
test("analysis failure refunds once and a fresh upload can succeed", async ({ page, context }) => {
  await session(context, "failure");
  await context.request.post(`${process.env.E2E_PROVIDER}/control`, { data: { failAnalysis: true } });
  try {
    await upload(page);
    await expect(page.getByText("AUDIO_TOO_QUIET", { exact: true })).toBeVisible({ timeout: 45000 });
    await expect.poll(() => balance(context.request, "VOCAL_ANALYSIS"), { intervals: [1000] }).toBe(5);
    await page.reload();
    expect(await balance(context.request, "VOCAL_ANALYSIS")).toBe(5);
  } finally {
    await context.request.post(`${process.env.E2E_PROVIDER}/control`, { data: { failAnalysis: false } });
  }
  await upload(page);
  await expect(page).toHaveURL(/\/vocal-profiles\/[a-f0-9-]+$/, { timeout: 45000 });
  expect(await balance(context.request, "VOCAL_ANALYSIS")).toBe(4);
});

async function control(request, state = {}) {
  expect((await request.post(`${process.env.E2E_PROVIDER}/control`, { data: state })).ok()).toBeTruthy();
}
async function conversions(request) {
  return (await (await request.get(`${process.env.E2E_PROVIDER}/stats`)).json()).conversions;
}
async function prepareRecommendation(page) {
  await upload(page);
  await expect(page).toHaveURL(/\/vocal-profiles\/[a-f0-9-]+$/, { timeout: 45000 });
  await page.getByRole("link", { name: "추천 결과 보기", exact: true }).click();
  await expect(page.getByRole("button", { name: "이 곡으로 AI 믹싱", exact: true }).first()).toBeEnabled();
}
async function submitMix(page) {
  await page.getByRole("button", { name: "이 곡으로 AI 믹싱", exact: true }).first().click();
  const submitted = page.waitForResponse(
    (r) => r.url().endsWith("/api/mixing-jobs") && r.request().method() === "POST",
  );
  await page.getByRole("dialog").getByRole("button", { name: "AI 믹싱 시작", exact: true }).click();
  const response = await submitted;
  expect(response.status()).toBe(202);
  await expect(page).toHaveURL(/\/library\/mixes\/[a-f0-9-]+$/);
  return { id: page.url().split("/").at(-1), data: response.request().postDataJSON() };
}

test("in-flight mixing survives reload/navigation and concurrent replay charges once; private mix stays private", async ({
  page,
  context,
  browser,
}) => {
  await session(context, "resumed");
  await prepareRecommendation(page);
  await control(context.request, { holdMixing: true });
  const before = await conversions(context.request);
  try {
    const { id, data } = await submitMix(page);
    await expect.poll(() => conversions(context.request)).toBe(before + 1);
    const url = page.url();
    await page.reload();
    expect((await (await context.request.get(`/api/mixing-jobs/${id}`)).json()).status).toBe("processing");
    await page.goto("/library?tab=mixes");
    await page.locator(`a[href="/library/mixes/${id}"]`).first().click();
    await expect(page).toHaveURL(url);
    const replies = await Promise.all([1, 2].map(() => context.request.post("/api/mixing-jobs", { data })));
    expect(replies.filter((reply) => reply.status() === 202).length).toBeGreaterThanOrEqual(1);
    for (let reply of replies) {
      if (reply.status() === 429) {
        // Analysis and mixing share the new submission bucket. Record this intentional difference.
        const seconds = Number(reply.headers()["retry-after"]);
        expect(seconds).toBeGreaterThan(0);
        expect(seconds).toBeLessThanOrEqual(10);
        expect((await reply.json()).error.code).toBe("RATE_LIMITED");
        test.info().annotations.push({
          type: "intentional-policy-difference",
          description: `429; Retry-After=${seconds}; replay must retain job and balance`,
        });
        await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        reply = await context.request.post("/api/mixing-jobs", { data });
      }
      expect(reply.status()).toBe(202);
      expect((await reply.json()).id).toBe(id);
    }
    expect(await balance(context.request, "AI_MIXING")).toBe(4);
    expect(await conversions(context.request)).toBe(before + 1);
    const other = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
    try {
      await session(other, "other");
      for (const suffix of ["", "/audio"])
        expect((await other.request.get(`/api/mixing-jobs/${id}${suffix}`)).status()).toBe(404);
      expect((await other.request.delete(`/api/mixing-jobs/${id}`)).status()).toBe(404);
    } finally {
      await other.close();
    }
    await control(context.request);
    await expect(page.getByRole("button", { name: /AI 믹싱 결과 재생$/ })).toBeEnabled({ timeout: 45000 });
    expect(await balance(context.request, "AI_MIXING")).toBe(4);
    expect(await conversions(context.request)).toBe(before + 1);
    const stranger = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
    try {
      await session(stranger, "other");
      expect((await context.request.get(`/api/mixing-jobs/${id}/audio`)).status()).toBe(200);
      for (const suffix of ["", "/audio"])
        expect((await stranger.request.get(`/api/mixing-jobs/${id}${suffix}`)).status()).toBe(404);
      expect((await stranger.request.delete(`/api/mixing-jobs/${id}`)).status()).toBe(404);
    } finally {
      await stranger.close();
    }
  } finally {
    await control(context.request);
  }
});

for (const mode of ["preflight", "submitted"]) {
  test(`mixing ${mode} failure preserves its refund contract across reload`, async ({ page, context }) => {
    await session(context, mode);
    await prepareRecommendation(page);
    const before = await conversions(context.request);
    await control(context.request, mode === "preflight" ? { failTarget: true } : { failMixing: true });
    try {
      const { id } = await submitMix(page);
      await expect(page.getByText("믹싱을 완료하지 못했어요.", { exact: true })).toBeVisible({ timeout: 45000 });
      const expected = mode === "preflight" ? 5 : 4;
      await expect.poll(() => balance(context.request, "AI_MIXING")).toBe(expected);
      await page.reload();
      await expect(page.getByText("믹싱을 완료하지 못했어요.", { exact: true })).toBeVisible();
      expect((await (await context.request.get(`/api/mixing-jobs/${id}`)).json()).status).toBe("failed");
      expect(await balance(context.request, "AI_MIXING")).toBe(expected);
      expect(await conversions(context.request)).toBe(before + (mode === "submitted" ? 1 : 0));
    } finally {
      await control(context.request);
    }
  });
}

test("expired sessions and ordinary users cannot operate admin; admin adjustment persists and empty wallet rejects work", async ({
  page,
  context,
  browser,
}) => {
  await session(context, "expired");
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login\?/);
  for (const path of ["/api/account/ticket-balance", "/api/admin/users"])
    expect((await context.request.get(path)).status()).toBe(401);
  await session(context, "empty");
  await prepareRecommendation(page);
  expect((await context.request.get("/api/admin/users")).status()).toBe(403);
  expect(
    (
      await context.request.post("/api/admin/ticket-adjustments", {
        data: {
          userId: accounts.empty.id,
          kind: "AI_MIXING",
          amount: 5,
          reason: "unauthorized",
          idempotencyKey: crypto.randomUUID(),
        },
      })
    ).status(),
  ).toBe(403);
  const admin = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
  try {
    await session(admin, "admin");
    const adminPage = await admin.newPage();
    await adminPage.goto("/admin?q=empty%40example.test");
    await expect(adminPage.getByRole("heading", { name: "Copysinger 운영", exact: true })).toBeVisible();
    expect((await admin.request.get("/api/admin/users?q=empty%40example.test")).status()).toBe(200);
    await adminPage.locator('select[name="userId"]').selectOption(accounts.empty.id);
    await adminPage.locator('select[name="kind"]').selectOption("AI_MIXING");
    await adminPage.getByLabel("조정량", { exact: true }).fill("-5");
    await adminPage.getByLabel("사유", { exact: true }).fill("E2E empty wallet");
    const adjustment = adminPage.waitForResponse(
      (r) => r.url().endsWith("/api/admin/ticket-adjustments") && r.request().method() === "POST",
    );
    await adminPage.getByRole("button", { name: "적용", exact: true }).click();
    const reply = await adjustment;
    expect(reply.status()).toBe(201);
    expect((await reply.json()).balanceAfter).toBe(0);
    const replay = await admin.request.post("/api/admin/ticket-adjustments", { data: reply.request().postDataJSON() });
    expect(replay.status()).toBe(201);
    expect((await replay.json()).balanceAfter).toBe(0);
    await adminPage.reload();
    expect(await balance(context.request, "AI_MIXING")).toBe(0);
  } finally {
    await admin.close();
  }
  // Keep the already displayed recommendation to exercise stale balance at submission, as in two open tabs.
  await page.getByRole("button", { name: "이 곡으로 AI 믹싱", exact: true }).first().click();
  const rejected = page.waitForResponse((r) => r.url().endsWith("/api/mixing-jobs") && r.request().method() === "POST");
  const before = await conversions(context.request);
  await page.getByRole("dialog").getByRole("button", { name: "AI 믹싱 시작", exact: true }).click();
  const response = await rejected;
  expect(response.status()).toBe(402);
  expect((await response.json()).error.code).toBe("INSUFFICIENT_TICKETS");
  expect(await balance(context.request, "AI_MIXING")).toBe(0);
  expect(await conversions(context.request)).toBe(before);
  const history = await context.request.get("/api/mixing-jobs");
  expect((await history.json()).jobs).toHaveLength(0);
});
