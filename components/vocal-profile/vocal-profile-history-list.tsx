import Link from "next/link";
import { AudioLines, CalendarDays, ChevronRight, Gauge, Music2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { midiToNoteName } from "@/lib/vocal-profile/pitch";

export type VocalProfileHistoryPayload = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  profiles: Array<{
    id: string;
    minMidi: number;
    maxMidi: number;
    medianMidi: number;
    tessituraLowMidi: number;
    tessituraHighMidi: number;
    voicedRatio: number;
    pitchStability: number;
    analyzer: string;
    analyzerVersion: string;
    durationMs: number | null;
    mimeType: string;
    recommendationCount: number;
    mixingCount: number;
    latestRecommendationId: string | null;
    createdAt: string;
  }>;
};

export function VocalProfileHistoryList({ history }: { history: VocalProfileHistoryPayload }) {
  if (history.profiles.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed p-12 text-center">
        <AudioLines className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
        <p className="mt-4 font-medium">아직 저장된 보컬 프로필이 없어요.</p>
        <p className="mt-2 text-sm text-muted-foreground">노래 한 소절을 분석하면 음역과 제출한 보컬을 여기에 보관합니다.</p>
        <Link className={`${buttonVariants()} mt-6`} href="/profile">첫 프로필 만들기</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {history.profiles.map((profile) => (
        <article className="rounded-2xl border bg-background p-5 shadow-sm" key={profile.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge variant="secondary">보컬 프로필</Badge>
              <h2 className="mt-3 text-xl font-semibold">
                {midiToNoteName(profile.tessituraLowMidi)} – {midiToNoteName(profile.tessituraHighMidi)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">전체 {midiToNoteName(profile.minMidi)} – {midiToNoteName(profile.maxMidi)}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="flex items-center gap-1"><CalendarDays className="size-3" aria-hidden="true" />{new Date(profile.createdAt).toLocaleDateString("ko-KR")}</p>
              <p className="mt-1">{profile.durationMs ? `${(profile.durationMs / 1000).toFixed(1)}초` : "길이 정보 없음"}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/45 p-3"><Gauge className="mx-auto size-4 text-emerald-600" /><p className="mt-2 text-xs text-muted-foreground">안정도</p><p className="mt-1 font-semibold">{Math.round(profile.pitchStability * 100)}%</p></div>
            <div className="rounded-xl bg-muted/45 p-3"><Sparkles className="mx-auto size-4 text-emerald-600" /><p className="mt-2 text-xs text-muted-foreground">추천</p><p className="mt-1 font-semibold">{profile.recommendationCount}</p></div>
            <div className="rounded-xl bg-muted/45 p-3"><Music2 className="mx-auto size-4 text-emerald-600" /><p className="mt-2 text-xs text-muted-foreground">믹싱</p><p className="mt-1 font-semibold">{profile.mixingCount}</p></div>
          </div>
          <Link className={`${buttonVariants({ variant: "outline" })} mt-5 w-full`} href={`/vocal-profiles/${profile.id}`}>
            분석과 제출 보컬 보기 <ChevronRight className="ml-auto size-4" aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
  );
}
