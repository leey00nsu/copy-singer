export const ADMIN_DESCRIPTION = "서비스 사용 현황과 티켓, 작업 상태를 확인하고 관리할 수 있어요.";

export const ADMIN_JOB_FILTERS = [
  ["", "전체 상태"],
  ["PENDING", "접수 대기"],
  ["PREPARING", "준비 중"],
  ["SUBMITTED", "접수 완료"],
  ["PROCESSING", "처리 중"],
  ["SUCCEEDED", "완료"],
  ["FAILED", "실패"],
  ["CANCELED", "취소"],
] as const;
export const ADMIN_GUEST_FILTERS = [
  ["", "전체 상태"],
  ["unclaimed", "미저장"],
  ["claimed", "저장 완료"],
  ["expired", "보관 종료"],
] as const;

export type AdminFilters = {
  tab: "users" | "mixing";
  audience: "members" | "guests";
  usersQ: string;
  guestsQ: string;
  jobsQ: string;
  usersPage: number;
  guestsPage: number;
  jobsPage: number;
  jobStatus: string;
  guestStatus: string;
  memberId: string;
};

export function parseAdminFilters(input: Record<string, string | string[] | undefined>): AdminFilters {
  const value = (key: string) => (typeof input[key] === "string" ? input[key].trim() : "");
  const page = (key: string) => {
    const number = Number(value(key) || 1);
    return Number.isSafeInteger(number) && number > 0 ? number : 1;
  };
  const tab = value("tab") === "mixing" ? "mixing" : "users";
  const audience = value("audience") === "guests" ? "guests" : "members";
  const jobStatus = (value("jobStatus") || value("status")).toUpperCase();
  const guestStatus = value("guestStatus");
  const legacyQuery = value("q");
  return {
    tab,
    audience,
    usersQ: value("usersQ") || (tab === "users" && audience === "members" ? legacyQuery : ""),
    guestsQ: value("guestsQ") || (tab === "users" && audience === "guests" ? legacyQuery : ""),
    jobsQ: value("jobsQ") || (tab === "mixing" ? legacyQuery : ""),
    usersPage: page("usersPage"),
    guestsPage: page("guestsPage"),
    jobsPage: page("jobsPage"),
    jobStatus: ADMIN_JOB_FILTERS.some(([key]) => key === jobStatus) ? jobStatus : "",
    guestStatus: ADMIN_GUEST_FILTERS.some(([key]) => key === guestStatus) ? guestStatus : "",
    memberId: value("memberId"),
  };
}

export function adminSearchParams(filters: AdminFilters, patch: Partial<AdminFilters> = {}) {
  const values = { ...filters, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (
      value === "" ||
      (key === "tab" && value === "users") ||
      (key === "audience" && value === "members") ||
      (typeof value === "number" && value === 1)
    )
      continue;
    params.set(key, String(value));
  }
  return params;
}

export function adminHref(filters: AdminFilters, patch: Partial<AdminFilters> = {}) {
  const query = adminSearchParams(filters, patch).toString();
  return query ? `/admin?${query}` : "/admin";
}

export function guestStorageState(trial: { claimedAt: Date | null; expiresAt: Date | null }, now: Date) {
  return trial.claimedAt ? "claimed" : trial.expiresAt && trial.expiresAt <= now ? "expired" : "unclaimed";
}

export function adminDate(value: Date | null) {
  return value
    ? value.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" })
    : "—";
}
