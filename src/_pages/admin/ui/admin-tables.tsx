import Link from "next/link";
import { ticketBalanceForKind } from "@/entities/ticket/index.model";
import type {
  listAdminGuests,
  listAdminMixingJobs,
  listAdminUsers,
} from "@/features/inspect-admin-operations/index.server";
import { TicketAdjustmentSheet } from "@/features/manage-tickets";
import { Badge } from "@/shared/ui/badge";
import { ADMIN_JOB_FILTERS, type AdminFilters, adminDate, adminHref, guestStorageState } from "../model/filters";
import { AdminMixingJobDetails } from "./admin-mixing-job-details";

const th = "px-4 py-3 text-left text-xs font-medium text-muted-foreground";
const td = "px-4 py-4 text-sm";
const table =
  "w-full text-left max-sm:[&_thead]:sr-only max-sm:[&_tbody]:block max-sm:[&_tr]:grid max-sm:[&_tr]:grid-cols-2 max-sm:[&_tr]:gap-x-4 max-sm:[&_tr]:px-1 max-sm:[&_td]:block max-sm:[&_td]:px-2 max-sm:[&_td]:py-2 max-sm:[&_td[data-admin-secondary]]:hidden";

export function AdminMembersTable({ users }: { users: Awaited<ReturnType<typeof listAdminUsers>>["users"] }) {
  return (
    <table className={table} aria-label="회원 목록">
      <thead className="bg-muted/35">
        <tr>
          <th className={th}>회원</th>
          <th className={th}>보유 티켓</th>
          <th className={th}>프로필</th>
          <th className={`${th} max-sm:hidden`}>가입일</th>
          <th className={th}>관리</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {users.map((user) => (
          <tr key={user.id}>
            <td className={`${td} max-sm:col-span-2`}>
              <p className="font-medium">{user.name}</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
            </td>
            <td className={td}>
              <span className="text-xs text-muted-foreground sm:hidden">
                보유 티켓
                <br />
              </span>
              <span className="whitespace-nowrap text-xs tabular-nums">
                분석 {ticketBalanceForKind(user.ticketWallets, "VOCAL_ANALYSIS")} · 믹싱{" "}
                {ticketBalanceForKind(user.ticketWallets, "AI_MIXING")}
              </span>
            </td>
            <td className={td}>
              <span className="text-xs text-muted-foreground sm:hidden">
                프로필
                <br />
              </span>
              {user._count.vocalProfiles}
            </td>
            <td data-admin-secondary className={`${td} whitespace-nowrap text-xs text-muted-foreground max-sm:hidden`}>
              {adminDate(user.createdAt)}
            </td>
            <td className={`${td} max-sm:col-span-2 max-sm:justify-self-end`}>
              <TicketAdjustmentSheet
                user={{ id: user.id, name: user.name, email: user.email, ticketWallets: user.ticketWallets }}
              />
            </td>
          </tr>
        ))}
        {!users.length ? (
          <tr>
            <td className="px-4 py-12 text-center text-sm text-muted-foreground max-sm:col-span-2" colSpan={5}>
              표시할 회원이 없어요. 검색이나 선택한 회원 조건을 확인해 주세요.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export function AdminGuestsTable({
  trials,
  filters,
  now,
}: {
  trials: Awaited<ReturnType<typeof listAdminGuests>>["trials"];
  filters: AdminFilters;
  now: Date;
}) {
  return (
    <table className={table} aria-label="체험 방문자 목록">
      <thead className="bg-muted/35">
        <tr>
          <th className={th}>체험 ID</th>
          <th className={th}>분석 상태</th>
          <th className={th}>결과 저장</th>
          <th className={th}>보관기한</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {trials.map((trial) => {
          const storage = guestStorageState(trial, now);
          const status = trial.job?.status;
          const label =
            status === "SUCCEEDED" || trial.consumedAt
              ? "분석 완료"
              : status === "FAILED"
                ? "분석 실패"
                : status
                  ? "처리 중"
                  : "분석 전";
          return (
            <tr key={trial.id}>
              <td className={`${td} max-sm:col-span-2`}>
                <span className="font-mono text-xs" title={trial.userId}>
                  {trial.userId.replace(/^guest-/, "").slice(0, 12)}
                </span>
              </td>
              <td className={td}>
                <Badge variant={status === "FAILED" ? "destructive" : "secondary"}>{label}</Badge>
              </td>
              <td className={td}>
                {storage === "claimed" ? (
                  trial.claimedBy ? (
                    <Link
                      className="text-xs underline underline-offset-4"
                      href={adminHref(filters, {
                        tab: "users",
                        audience: "members",
                        memberId: trial.claimedBy.id,
                        usersQ: "",
                        usersPage: 1,
                      })}
                    >
                      {trial.claimedBy.name}에게 저장 ↗
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">저장 완료 · 회원 정보 없음</span>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {storage === "expired" ? "보관 종료" : "미저장"}
                  </span>
                )}
              </td>
              <td className={`${td} text-xs text-muted-foreground max-sm:col-span-2`}>
                <span className="sm:hidden">보관기한 · </span>
                {storage === "claimed"
                  ? "회원 계정 보관"
                  : storage === "expired"
                    ? "보관 종료"
                    : adminDate(trial.expiresAt)}
              </td>
            </tr>
          );
        })}
        {!trials.length ? (
          <tr>
            <td className="px-4 py-12 text-center text-sm text-muted-foreground max-sm:col-span-2" colSpan={4}>
              표시할 체험 기록이 없어요. 검색어와 저장 상태를 확인해 주세요.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export function AdminMixingTable({ jobs }: { jobs: Awaited<ReturnType<typeof listAdminMixingJobs>>["jobs"] }) {
  return (
    <table className={table} aria-label="믹싱 작업 목록">
      <thead className="bg-muted/35">
        <tr>
          <th className={th}>곡 / 회원</th>
          <th className={th}>상태</th>
          <th className={th}>시도</th>
          <th className={th}>작업일</th>
          <th className={th}>관리</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {jobs.map((job) => (
          <tr key={job.id}>
            <td className={`${td} max-sm:col-span-2`}>
              <p className="font-medium">{job.song.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {job.song.artist} · {job.user.name}
              </p>
            </td>
            <td className={td}>
              <Badge variant={job.status === "FAILED" ? "destructive" : "secondary"}>
                {ADMIN_JOB_FILTERS.find(([key]) => key === job.status)?.[1] ?? job.status}
              </Badge>
              {job.errorCode ? <p className="mt-1 break-all text-[10px] text-destructive">{job.errorCode}</p> : null}
            </td>
            <td className={td}>
              <span className="text-xs text-muted-foreground sm:hidden">시도 · </span>
              {job.attempts}
            </td>
            <td className={`${td} text-xs text-muted-foreground`}>{adminDate(job.createdAt)}</td>
            <td className={`${td} max-sm:justify-self-end`}>
              <AdminMixingJobDetails
                job={{
                  ...job,
                  createdAt: job.createdAt.toISOString(),
                  completedAt: job.completedAt?.toISOString() ?? null,
                }}
              />
            </td>
          </tr>
        ))}
        {!jobs.length ? (
          <tr>
            <td className="px-4 py-12 text-center text-sm text-muted-foreground max-sm:col-span-2" colSpan={5}>
              표시할 믹싱 작업이 없어요. 검색어와 작업 상태를 확인해 주세요.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
