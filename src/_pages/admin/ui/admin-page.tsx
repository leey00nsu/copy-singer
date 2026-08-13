import { Activity, AlertTriangle, ChevronLeft, ChevronRight, Music2, Search, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { requireAdminPage } from "@/features/authentication/index.server";
import {
  getAdminOverview,
  listAdminMixingJobs,
  listAdminUsers,
} from "@/features/inspect-admin-operations/index.server";
import { TicketAdjustmentForm } from "@/features/manage-tickets";
import { PRIVATE_METADATA } from "@/shared/config/index.server";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { ProductFooter, ProductHeader } from "@/widgets/product-shell";
import { AdminMetricBand } from "./admin-metric-band";

const adminMetadata = PRIVATE_METADATA;

function positivePage(value: string | undefined) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1;
}

function adminHref({
  jobsPage,
  q,
  status,
  usersPage,
}: {
  jobsPage: number;
  q: string;
  status: string;
  usersPage: number;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (usersPage > 1) params.set("usersPage", String(usersPage));
  if (jobsPage > 1) params.set("jobsPage", String(jobsPage));
  const queryString = params.toString();
  return queryString ? `/admin?${queryString}` : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    jobsPage?: string;
    q?: string;
    status?: string;
    usersPage?: string;
  }>;
}) {
  const session = await requireAdminPage();
  const filters = await searchParams;
  const query = filters.q ?? "";
  const status = filters.status ?? "";
  const usersPage = positivePage(filters.usersPage);
  const jobsPage = positivePage(filters.jobsPage);
  const [overview, adjustmentUsers, userResult, jobResult] = await Promise.all([
    getAdminOverview(),
    listAdminUsers("", 1, 100),
    listAdminUsers(query, usersPage, 10),
    listAdminMixingJobs(query, status, jobsPage, 10),
  ]);
  const activeJobs =
    (overview.jobs.pending ?? 0) +
    (overview.jobs.preparing ?? 0) +
    (overview.jobs.submitted ?? 0) +
    (overview.jobs.processing ?? 0);
  return (
    <div className="min-h-screen bg-background">
      <ProductHeader admin user={{ email: session.user.email, image: session.user.image, name: session.user.name }} />

      <main className="mx-auto w-full max-w-[82rem] px-6 py-8 lg:px-8 lg:py-10">
        <ProductPageIntro
          description="서비스의 사용 현황과 티켓을 관리하고, 작업 상태를 모니터링하세요."
          eyebrow="Admin"
          title="Copysinger 운영"
        />
        <AdminMetricBand
          className="mt-8"
          metrics={[
            { label: "사용자", value: overview.users, detail: "전체 가입자", icon: Users },
            { label: "진행 작업", value: activeJobs, detail: "현재 실행 중", icon: Activity },
            { label: "24시간 실패", value: overview.recentFailures, detail: "최근 24시간 기준", icon: AlertTriangle },
            { label: "티켓 잔액", value: overview.ticketNet, detail: "전체 잔여 티켓", icon: Ticket },
          ]}
        />

        <section className="mt-7 rounded-2xl border bg-background p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Music2 className="size-4" /> 음원 관리
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">곡 추가, Modal 분석 상태와 공개 여부를 관리합니다.</p>
            </div>
            <Button nativeButton={false} render={<Link href="/admin/songs" />} size="sm">
              음원 관리 열기
            </Button>
          </div>
        </section>

        <section className="mt-7">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">티켓 조정</h2>
            <p className="mt-1 text-xs text-muted-foreground">사용자의 티켓 잔액을 관리하고 조정할 수 있습니다.</p>
          </div>
          <div className="rounded-2xl bg-muted/20 p-5">
            <TicketAdjustmentForm users={adjustmentUsers.users} />
          </div>
        </section>

        <form
          className="mt-5 grid gap-3 rounded-2xl bg-muted/20 p-5 md:grid-cols-[minmax(0,1fr)_22rem_auto] md:items-end"
          method="get"
        >
          <input name="usersPage" type="hidden" value="1" />
          <input name="jobsPage" type="hidden" value="1" />
          <label className="grid gap-1.5 text-[11px] font-medium">
            검색
            <input
              className="h-9 rounded-md border bg-background px-3 text-xs"
              defaultValue={query}
              name="q"
              placeholder="이메일, 이름, 아티스트, 곡 제목으로 검색"
            />
          </label>
          <label className="grid gap-1.5 text-[11px] font-medium">
            작업 상태
            <select className="h-9 rounded-md border bg-background px-3 text-xs" defaultValue={status} name="status">
              <option value="">전체 상태</option>
              {Object.keys({
                pending: 0,
                preparing: 0,
                submitted: 0,
                processing: 0,
                succeeded: 0,
                failed: 0,
                canceled: 0,
              }).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <Button className="h-9" size="sm" type="submit">
            <Search aria-hidden="true" className="size-3.5" /> 검색
          </Button>
        </form>

        <section className="mt-5 grid gap-4 xl:grid-cols-[.92fr_1.08fr]">
          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">사용자</h2>
              <span className="text-[10px] text-muted-foreground">{userResult.total}명</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="border-b bg-muted/20 text-[10px] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">사용자</th>
                    <th className="font-medium">이메일</th>
                    <th className="font-medium">티켓</th>
                    <th className="font-medium">프로필</th>
                    <th className="font-medium">믹싱</th>
                    <th className="font-medium">가입일</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {userResult.users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="text-[11px] text-muted-foreground">{user.email}</td>
                      <td className="tabular-nums">{user.ticketBalance}</td>
                      <td className="tabular-nums">{user._count.vocalProfiles}</td>
                      <td className="tabular-nums">{user._count.mixingJobs}</td>
                      <td className="text-[10px] text-muted-foreground">
                        {user.createdAt.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav
              aria-label="사용자 페이지"
              className="flex items-center justify-end gap-1 border-t px-3 py-2 text-[10px]"
            >
              {userResult.page > 1 ? (
                <Link
                  aria-label="이전 사용자 페이지"
                  className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                  href={adminHref({ jobsPage: jobResult.page, q: query, status, usersPage: userResult.page - 1 })}
                >
                  <ChevronLeft aria-hidden="true" className="size-3.5" />
                </Link>
              ) : (
                <span aria-hidden="true" className="size-7" />
              )}
              <span className="px-2 tabular-nums text-muted-foreground">
                {userResult.page} / {userResult.pageCount}
              </span>
              {userResult.page < userResult.pageCount ? (
                <Link
                  aria-label="다음 사용자 페이지"
                  className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                  href={adminHref({ jobsPage: jobResult.page, q: query, status, usersPage: userResult.page + 1 })}
                >
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                </Link>
              ) : (
                <span aria-hidden="true" className="size-7" />
              )}
            </nav>
          </div>

          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">믹싱 작업</h2>
              <span className="text-[10px] text-muted-foreground">{jobResult.total}건</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-b bg-muted/20 text-[10px] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">곡 제목</th>
                    <th className="font-medium">사용자</th>
                    <th className="font-medium">상태</th>
                    <th className="font-medium">시도</th>
                    <th className="font-medium">최종 시도</th>
                    <th className="font-medium">작업일</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {jobResult.jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{job.song.title}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{job.song.artist}</p>
                      </td>
                      <td className="text-[10px] text-muted-foreground">{job.user.email}</td>
                      <td>
                        <Badge className="text-[9px]" variant={job.status === "FAILED" ? "destructive" : "secondary"}>
                          {job.status.toLowerCase()}
                        </Badge>
                        {job.errorCode ? <p className="mt-1 text-[9px] text-destructive">{job.errorCode}</p> : null}
                      </td>
                      <td className="tabular-nums">{job.attempts}</td>
                      <td className="text-[10px] text-muted-foreground">
                        {(job.completedAt ?? job.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="text-[11px] text-muted-foreground">
                        {job.createdAt.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav
              aria-label="믹싱 작업 페이지"
              className="flex items-center justify-end gap-1 border-t px-3 py-2 text-[10px]"
            >
              {jobResult.page > 1 ? (
                <Link
                  aria-label="이전 믹싱 작업 페이지"
                  className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                  href={adminHref({ jobsPage: jobResult.page - 1, q: query, status, usersPage: userResult.page })}
                >
                  <ChevronLeft aria-hidden="true" className="size-3.5" />
                </Link>
              ) : (
                <span aria-hidden="true" className="size-7" />
              )}
              {Array.from({ length: jobResult.pageCount }, (_, index) => index + 1).map((page) => (
                <Link
                  aria-current={page === jobResult.page ? "page" : undefined}
                  className={`flex size-7 items-center justify-center rounded-md tabular-nums ${page === jobResult.page ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  href={adminHref({ jobsPage: page, q: query, status, usersPage: userResult.page })}
                  key={page}
                >
                  {page}
                </Link>
              ))}
              {jobResult.page < jobResult.pageCount ? (
                <Link
                  aria-label="다음 믹싱 작업 페이지"
                  className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                  href={adminHref({ jobsPage: jobResult.page + 1, q: query, status, usersPage: userResult.page })}
                >
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                </Link>
              ) : (
                <span aria-hidden="true" className="size-7" />
              )}
            </nav>
          </div>
        </section>

        <p className="mt-6 text-[10px] leading-5 text-muted-foreground">
          개인정보 보호를 위해 관리자 화면에는 사용자 레퍼런스 오디오 재생·다운로드와 저장소 URL을 제공하지 않습니다.
        </p>
      </main>

      <ProductFooter />
    </div>
  );
}

export { adminMetadata };
