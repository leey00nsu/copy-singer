import { ChevronLeft, ChevronRight, Music2, Search } from "lucide-react";
import Link from "next/link";
import { requireAdminPage } from "@/features/authentication/index.server";
import { type AdminCatalogEntryView, CatalogManager, CatalogSnapshotToolbar } from "@/features/manage-song-catalog";
import { listAdminCatalog } from "@/features/manage-song-catalog/index.server";
import { PRIVATE_METADATA } from "@/shared/config/index.server";
import { Button } from "@/shared/ui/button";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { ProductFooter, ProductHeader } from "@/widgets/product-shell";

export const adminSongCatalogMetadata = PRIVATE_METADATA;

function positivePage(value: string | undefined) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1;
}

function pageHref(page: number, q: string, status: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/songs?${query}` : "/admin/songs";
}

function catalogEntryView(
  entry: Awaited<ReturnType<typeof listAdminCatalog>>["entries"][number],
): AdminCatalogEntryView {
  return {
    id: entry.id,
    position: entry.position,
    status: entry.status,
    song: {
      id: entry.song.id,
      title: entry.song.title,
      artist: entry.song.artist,
      originalKey: entry.song.originalKey,
      lifecycleStatus: entry.song.lifecycleStatus,
      activeSourceId: entry.song.activeSourceId,
      currentAnalysisId: entry.song.currentAnalysisId,
      targetAssetId: entry.song.targetAssetId,
      sources: entry.song.sources.map((source) => {
        const readyAnalysis = source.analyses.find(
          (analysis) => analysis.status === "READY" && analysis.cleanupConfirmed,
        );
        return {
          id: source.id,
          revision: source.revision,
          sourceUrl: source.sourceUrl,
          sourceVideoId: source.sourceVideoId,
          sourceLabel: source.sourceLabel,
          status: source.status,
          analysisStatus: source.analysisJob?.status ?? (readyAnalysis ? "SUCCEEDED" : null),
          analysisError: source.analysisJob?.errorCode ?? null,
          analysisReady: Boolean(readyAnalysis),
          estimatedKey: readyAnalysis?.estimatedKey ?? null,
          keyConfidence: readyAnalysis?.keyConfidence ?? null,
          targetReady: source.targetAssets.some(
            (target) => target.status === "READY" && target.sourceVideoId === source.sourceVideoId,
          ),
        };
      }),
    },
  };
}

export default async function AdminSongCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const session = await requireAdminPage();
  const filters = await searchParams;
  const page = positivePage(filters.page);
  const q = filters.q ?? "";
  const status = ["DRAFT", "ACTIVE", "ARCHIVED"].includes(filters.status ?? "")
    ? (filters.status as "DRAFT" | "ACTIVE" | "ARCHIVED")
    : "";
  const result = await listAdminCatalog({ page, q, status });

  return (
    <div className="min-h-screen bg-background">
      <ProductHeader admin user={{ email: session.user.email, image: session.user.image, name: session.user.name }} />
      <main className="mx-auto w-full max-w-[72rem] px-6 py-8 lg:px-8 lg:py-10">
        <Link
          className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          href="/admin"
        >
          <ChevronLeft className="size-3.5" /> 운영 대시보드
        </Link>
        <ProductPageIntro
          description="곡 정보와 음원을 등록하고 Modal 분석 상태를 확인한 뒤 추천 카탈로그에 공개하세요."
          eyebrow="Admin"
          title="음원 관리"
        />

        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Music2 className="size-4" /> 등록된 음원
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground">{result.total}곡</span>
              <CatalogSnapshotToolbar />
            </div>
          </div>
          <form
            className="mb-3 grid gap-3 rounded-xl bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"
            method="get"
          >
            <label className="grid gap-1 text-[11px] font-medium">
              곡 검색
              <input
                className="h-9 rounded-md border bg-background px-3 text-xs"
                defaultValue={q}
                name="q"
                placeholder="곡 제목 또는 아티스트"
              />
            </label>
            <label className="grid gap-1 text-[11px] font-medium">
              공개 상태
              <select className="h-9 rounded-md border bg-background px-3 text-xs" defaultValue={status} name="status">
                <option value="">전체</option>
                <option value="DRAFT">준비 중</option>
                <option value="ACTIVE">공개</option>
                <option value="ARCHIVED">보관</option>
              </select>
            </label>
            <Button className="h-9" size="sm" type="submit">
              <Search /> 검색
            </Button>
          </form>
          <CatalogManager entries={result.entries.map(catalogEntryView)} />
          {result.pageCount > 1 ? (
            <nav aria-label="음원 관리 페이지" className="mt-3 flex items-center justify-center gap-1 text-xs">
              {result.page > 1 ? (
                <Link
                  aria-label="이전 음원 페이지"
                  className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
                  href={pageHref(result.page - 1, q, status)}
                >
                  <ChevronLeft />
                </Link>
              ) : (
                <span className="size-8" />
              )}
              <span className="px-3 tabular-nums text-muted-foreground">
                {result.page} / {result.pageCount}
              </span>
              {result.page < result.pageCount ? (
                <Link
                  aria-label="다음 음원 페이지"
                  className="flex size-8 items-center justify-center rounded-md hover:bg-muted"
                  href={pageHref(result.page + 1, q, status)}
                >
                  <ChevronRight />
                </Link>
              ) : (
                <span className="size-8" />
              )}
            </nav>
          ) : null}
        </section>
      </main>
      <ProductFooter />
    </div>
  );
}
