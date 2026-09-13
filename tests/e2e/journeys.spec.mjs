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
