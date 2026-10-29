import { Search } from "lucide-react";
import Link from "next/link";
import { requireAdminPage } from "@/features/authentication/index.server";
import {
  getAdminOverview,
  listAdminGuests,
  listAdminMixingJobs,
  listAdminUsers,
} from "@/features/inspect-admin-operations/index.server";
import { PRIVATE_METADATA } from "@/shared/config/index.server";
import { Button } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { AdminNavigation } from "@/widgets/admin-navigation";
import { ProductFooter, ProductHeader } from "@/widgets/product-shell";
import {
  ADMIN_DESCRIPTION,
  ADMIN_GUEST_FILTERS,
  ADMIN_JOB_FILTERS,
  type AdminFilters,
  adminHref,
  adminSearchParams,
  parseAdminFilters,
} from "../model/filters";
import { AdminAudienceTabs } from "./admin-audience-tabs";
import { AdminPagination } from "./admin-pagination";
import { AdminGuestsTable, AdminMembersTable, AdminMixingTable } from "./admin-tables";

const adminMetadata = PRIVATE_METADATA;

function AdminSearch({ filters, kind }: { filters: AdminFilters; kind: "members" | "guests" | "mixing" }) {
  const queryKey = kind === "members" ? "usersQ" : kind === "guests" ? "guestsQ" : "jobsQ";
  const pageKey = kind === "members" ? "usersPage" : kind === "guests" ? "guestsPage" : "jobsPage";
  const statusKey = kind === "guests" ? "guestStatus" : kind === "mixing" ? "jobStatus" : null;
  const options = kind === "guests" ? ADMIN_GUEST_FILTERS : kind === "mixing" ? ADMIN_JOB_FILTERS : null;
  const params = adminSearchParams(filters);
  params.delete(queryKey);
  params.delete(pageKey);
  if (statusKey) params.delete(statusKey);
  if (kind === "members") params.delete("memberId");
  const label =
    kind === "members"
      ? "회원 이름 또는 이메일"
      : kind === "guests"
        ? "체험 ID 또는 결과를 저장한 회원"
        : "곡, 아티스트 또는 회원 이메일";
  return (
    <form method="get" className="mb-5 flex flex-wrap items-center gap-2">
      {Array.from(params).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-background px-3">
        <Search aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="sr-only">{label}</span>
        <input
          className="h-10 w-full min-w-32 bg-transparent text-sm outline-none"
          defaultValue={filters[queryKey]}
          name={queryKey}
          placeholder={label}
        />
      </label>
      {options && statusKey ? (
        <label>
          <span className="sr-only">{kind === "guests" ? "결과 저장 상태" : "작업 상태"}</span>
          <select
            className="h-10 rounded-lg border bg-background px-3 text-sm"
            defaultValue={filters[statusKey]}
            name={statusKey}
          >
            {options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <Button type="submit" variant="outline">
        검색
      </Button>
    </form>
  );
}

async function MembersList({ filters }: { filters: AdminFilters }) {
  const result = await listAdminUsers(filters.usersQ, filters.usersPage, 10, filters.memberId);
  return (
    <>
      {filters.memberId ? (
        <p className="mb-4 text-xs text-muted-foreground">
          결과를 저장한 회원을 보고 있어요.{" "}
          <Link className="ml-2 underline underline-offset-4" href={adminHref(filters, { memberId: "", usersPage: 1 })}>
            회원 선택 해제
          </Link>
        </p>
      ) : null}
      <AdminSearch filters={filters} kind="members" />
      <AdminMembersTable users={result.users} />
      <AdminPagination
        {...result}
        label="회원"
        previousHref={adminHref(filters, { usersPage: result.page - 1 })}
        nextHref={adminHref(filters, { usersPage: result.page + 1 })}
      />
      <p className="mt-5 text-xs text-muted-foreground">체험 계정은 회원 수와 티켓 조정 대상에 포함하지 않습니다.</p>
    </>
  );
}

async function GuestsList({ filters }: { filters: AdminFilters }) {
  const now = new Date();
  const result = await listAdminGuests({
    query: filters.guestsQ,
    page: filters.guestsPage,
    status: filters.guestStatus,
    now,
  });
  return (
    <>
      <AdminSearch filters={filters} kind="guests" />
      <AdminGuestsTable trials={result.trials} filters={filters} now={now} />
      <AdminPagination
        {...result}
        label="체험 기록"
        previousHref={adminHref(filters, { guestsPage: result.page - 1 })}
        nextHref={adminHref(filters, { guestsPage: result.page + 1 })}
      />
      <p className="mt-5 text-xs leading-6 text-muted-foreground">
        체험은 브라우저 식별 계정 기준입니다. 기존 회원도 결과를 저장할 수 있으므로 저장 건수는 신규 가입 수가 아닙니다.
      </p>
    </>
  );
}

async function MixingList({
  filters,
  overview,
}: {
  filters: AdminFilters;
  overview: Awaited<ReturnType<typeof getAdminOverview>>;
}) {
  const result = await listAdminMixingJobs(filters.jobsQ, filters.jobStatus, filters.jobsPage);
  const active =
    (overview.jobs.pending ?? 0) +
    (overview.jobs.preparing ?? 0) +
    (overview.jobs.submitted ?? 0) +
    (overview.jobs.processing ?? 0);
  return (
    <>
      <dl className="mb-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        {[
          { label: "전체 작업", value: Object.values(overview.jobs).reduce((sum, value) => sum + value, 0) },
          { label: "진행 작업", value: active },
          { label: "최근 24시간 실패", value: overview.recentFailures },
        ].map((item) => (
          <div key={item.label} className="flex items-baseline gap-2">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="font-semibold tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>
      <AdminSearch filters={filters} kind="mixing" />
      <AdminMixingTable jobs={result.jobs} />
      <AdminPagination
        {...result}
        label="믹싱 작업"
        previousHref={adminHref(filters, { jobsPage: result.page - 1 })}
        nextHref={adminHref(filters, { jobsPage: result.page + 1 })}
      />
    </>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAdminPage();
  const filters = parseAdminFilters(await searchParams);
  const overview = await getAdminOverview();
  const content =
    filters.tab === "mixing" ? (
      await MixingList({ filters, overview })
    ) : (
      <AdminAudienceTabs
        audience={filters.audience}
        members={overview.users}
        guests={overview.guests}
        membersHref={adminHref(filters, { tab: "users", audience: "members" })}
        guestsHref={adminHref(filters, { tab: "users", audience: "guests" })}
      >
        <p className="mb-5 text-xs text-muted-foreground">
          체험 결과를 회원 계정에 저장한 기록{" "}
          <strong className="font-medium text-foreground">{overview.claimedTrials}</strong>건
        </p>
        {filters.audience === "guests" ? await GuestsList({ filters }) : await MembersList({ filters })}
      </AdminAudienceTabs>
    );
  return (
    <div className="min-h-screen bg-background">
      <ProductHeader admin user={{ email: session.user.email, image: session.user.image, name: session.user.name }} />
      <main className="mx-auto w-full max-w-[72rem] px-6 py-8 lg:px-8 lg:py-10">
        <ProductPageIntro className="break-keep" description={ADMIN_DESCRIPTION} eyebrow="Admin" title="운영 관리" />
        <AdminNavigation
          current={filters.tab}
          usersHref={adminHref(filters, { tab: "users" })}
          mixingHref={adminHref(filters, { tab: "mixing" })}
        />
        <section aria-label={filters.tab === "mixing" ? "믹싱 관리" : "회원·체험 관리"} className="mt-7 min-w-0">
          {content}
        </section>
        <p className="mt-8 text-xs leading-6 text-muted-foreground">
          개인정보 보호를 위해 관리자 화면에서는 사용자 레퍼런스 오디오 재생·다운로드와 저장소 URL을 제공하지 않아요.
        </p>
      </main>
      <ProductFooter />
    </div>
  );
}

export { adminMetadata };
