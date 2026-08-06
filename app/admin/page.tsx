import { Activity, AlertTriangle, Search, Ticket, Users } from "lucide-react";
import { TicketAdjustmentForm } from "@/components/admin/ticket-adjustment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAdminOverview, listAdminMixingJobs, listAdminUsers } from "@/lib/admin/service";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdminPage();
  const filters = await searchParams;
  const query = filters.q ?? "";
  const status = filters.status ?? "";
  const [overview, userResult, jobResult] = await Promise.all([
    getAdminOverview(),
    listAdminUsers(query, 1, 20),
    listAdminMixingJobs(query, status, 1, 20),
  ]);
  const activeJobs = (overview.jobs.pending ?? 0) + (overview.jobs.preparing ?? 0) + (overview.jobs.submitted ?? 0) + (overview.jobs.processing ?? 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-14 sm:px-8">
      <p className="text-sm font-semibold text-emerald-700">ADMIN</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Copy Singer 운영</h1>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "사용자", value: overview.users, icon: Users },
          { label: "진행 작업", value: activeJobs, icon: Activity },
          { label: "24시간 실패", value: overview.recentFailures, icon: AlertTriangle },
          { label: "티켓 순변동", value: overview.ticketNet, icon: Ticket },
        ].map(({ label, value, icon: Icon }) => (
          <article className="rounded-2xl border bg-background p-5" key={label}>
            <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-5 text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">티켓 조정</h2>
          <p className="mt-1 text-sm text-muted-foreground">모든 조정은 관리자와 사유가 원장에 기록됩니다.</p>
        </div>
        <TicketAdjustmentForm users={userResult.users} />
      </section>

      <form className="mt-10 flex flex-wrap items-end gap-3" method="get">
        <label className="grid min-w-64 flex-1 gap-1.5 text-sm font-medium">
          검색
          <input className="h-10 rounded-lg border bg-background px-3 text-sm" defaultValue={query} name="q" placeholder="이메일, 이름, 곡, 아티스트" />
        </label>
        <label className="grid w-44 gap-1.5 text-sm font-medium">
          작업 상태
          <select className="h-10 rounded-lg border bg-background px-3 text-sm" defaultValue={status} name="status">
            <option value="">전체</option>
            {Object.keys({ pending: 0, preparing: 0, submitted: 0, processing: 0, succeeded: 0, failed: 0, canceled: 0 }).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <Button className="h-10" type="submit"><Search /> 조회</Button>
      </form>

      <section className="mt-8 grid gap-8 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">사용자</h2><span className="text-xs text-muted-foreground">{userResult.total}명</span></div>
          <div className="overflow-x-auto rounded-2xl border bg-background">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3">사용자</th><th>티켓</th><th>프로필</th><th>믹싱</th><th>가입</th></tr></thead>
              <tbody className="divide-y">{userResult.users.map((user) => <tr key={user.id}><td className="p-3"><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></td><td>{user.ticketBalance}</td><td>{user._count.vocalProfiles}</td><td>{user._count.mixingJobs}</td><td className="text-xs text-muted-foreground">{user.createdAt.toLocaleDateString("ko-KR")}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">믹싱 작업</h2><span className="text-xs text-muted-foreground">{jobResult.total}건</span></div>
          <div className="overflow-x-auto rounded-2xl border bg-background">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3">곡</th><th>사용자</th><th>상태</th><th>시도</th><th>생성</th></tr></thead>
              <tbody className="divide-y">{jobResult.jobs.map((job) => <tr key={job.id}><td className="p-3"><p className="font-medium">{job.song.title}</p><p className="text-xs text-muted-foreground">{job.song.artist}</p></td><td className="text-xs">{job.user.email}</td><td><Badge variant={job.status === "FAILED" ? "destructive" : "secondary"}>{job.status.toLowerCase()}</Badge>{job.errorCode ? <p className="mt-1 text-[10px] text-destructive">{job.errorCode}</p> : null}</td><td>{job.attempts}</td><td className="text-xs text-muted-foreground">{job.createdAt.toLocaleString("ko-KR")}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>
      <p className="mt-8 text-xs text-muted-foreground">개인정보 보호를 위해 관리자 화면에는 사용자 레퍼런스 오디오 재생·다운로드와 저장소 URL을 제공하지 않습니다.</p>
    </main>
  );
}
