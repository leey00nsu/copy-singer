import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_DESCRIPTION,
  adminHref,
  adminSearchParams,
  guestStorageState,
  parseAdminFilters,
} from "../src/_pages/admin/model/filters";

test("admin list state survives menu switches and only the searched list page resets", () => {
  const filters = parseAdminFilters({
    usersQ: "Singer",
    usersPage: "3",
    guestsQ: "guest",
    guestStatus: "claimed",
    guestsPage: "2",
    jobsQ: "Song",
    jobStatus: "failed",
    jobsPage: "4",
  });
  const jobs = parseAdminFilters(
    Object.fromEntries(new URL(adminHref(filters, { tab: "mixing" }), "https://app.test").searchParams),
  );
  assert.equal(jobs.tab, "mixing");
  assert.equal(jobs.usersQ, "Singer");
  assert.equal(jobs.usersPage, 3);
  assert.equal(jobs.jobsQ, "Song");
  assert.equal(jobs.jobStatus, "FAILED");
  assert.equal(jobs.jobsPage, 4);
  assert.equal(jobs.guestStatus, "claimed");
  assert.equal(jobs.guestsPage, 2);
  const updated = parseAdminFilters(Object.fromEntries(adminSearchParams(jobs, { usersQ: "New", usersPage: 1 })));
  assert.equal(updated.usersPage, 1);
  assert.equal(updated.jobsPage, 4);
  assert.equal(updated.guestsPage, 2);
});

test("admin defaults, legacy URLs, repeated parameters, and invalid statuses are normalized", () => {
  assert.equal(adminHref(parseAdminFilters({})), "/admin");
  assert.equal(parseAdminFilters({ q: "legacy" }).usersQ, "legacy");
  assert.equal(parseAdminFilters({ q: "legacy", tab: "mixing", status: "failed" }).jobStatus, "FAILED");
  const filters = parseAdminFilters({
    usersPage: "Infinity",
    jobsPage: "-2",
    guestsPage: "1.5",
    usersQ: ["one", "two"],
    jobStatus: "unknown",
    guestStatus: "unknown",
  });
  assert.equal(filters.usersPage, 1);
  assert.equal(filters.jobsPage, 1);
  assert.equal(filters.guestsPage, 1);
  assert.equal(filters.usersQ, "");
  assert.equal(filters.jobStatus, "");
  assert.equal(filters.guestStatus, "");
});

test("saved member destinations stay within admin and reset conflicting member search only", () => {
  const filters = parseAdminFilters({
    audience: "guests",
    usersQ: "other",
    usersPage: "3",
    guestsQ: "saved",
    jobsPage: "2",
  });
  const href = adminHref(filters, {
    tab: "users",
    audience: "members",
    memberId: "member/with?chars",
    usersQ: "",
    usersPage: 1,
  });
  assert.equal(href.startsWith("/admin?"), true);
  const result = parseAdminFilters(Object.fromEntries(new URL(href, "https://app.test").searchParams));
  assert.equal(result.memberId, "member/with?chars");
  assert.equal(result.usersQ, "");
  assert.equal(result.usersPage, 1);
  assert.equal(result.guestsQ, "saved");
  assert.equal(result.jobsPage, 2);
});

test("saved results take precedence over expiry and expiry is inclusive", () => {
  const now = new Date("2026-10-29T00:00:00Z");
  assert.equal(guestStorageState({ claimedAt: now, expiresAt: new Date(0) }, now), "claimed");
  assert.equal(guestStorageState({ claimedAt: null, expiresAt: now }, now), "expired");
  assert.equal(guestStorageState({ claimedAt: null, expiresAt: null }, now), "unclaimed");
});

test("admin description preserves the explicitly requested product copy", () => {
  assert.equal(ADMIN_DESCRIPTION, "서비스 사용 현황과 티켓, 작업 상태를 확인하고 관리할 수 있어요.");
});
