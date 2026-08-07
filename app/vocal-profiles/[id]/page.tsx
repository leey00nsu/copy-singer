import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AudioLines, CalendarDays, Music2, Sparkles } from "lucide-react";
import { VocalProfileResults } from "@/components/vocal-profile-results";
import { AudioWaveformPlayer } from "@/components/audio/audio-waveform-player";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageSession } from "@/lib/auth/session";
import { getVocalProfileDetail } from "@/lib/vocal-profile/history";

export default async function VocalProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePageSession(`/vocal-profiles/${id}`);
  const detail = await getVocalProfileDetail(session.user.id, id);
  if (!detail) notFound();

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-16 sm:px-8">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/vocal-profiles"><ArrowLeft className="size-4" /> 목록으로</Link>
      <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-700"><AudioLines className="size-5" /><span className="text-sm font-semibold">저장된 분석</span></div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">내 보컬 프로필</h1>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="size-4" /> {new Date(detail.profile.createdAt).toLocaleString("ko-KR")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary"><Sparkles className="size-3" /> 추천 {detail.recommendationCount}</Badge>
          <Badge variant="secondary"><Music2 className="size-3" /> 믹싱 {detail.mixingCount}</Badge>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader><CardTitle className="text-lg">제출한 보컬</CardTitle><p className="text-sm text-muted-foreground">분석에 사용한 표준화 오디오입니다. 로그인한 본인에게만 스트리밍됩니다.</p></CardHeader>
        <CardContent>
          <AudioWaveformPlayer label="제출한 보컬" src={detail.audioUrl} />
        </CardContent>
      </Card>

      <section className="mt-8"><VocalProfileResults profile={detail.profile} /></section>

      <div className="mt-8 flex flex-wrap gap-3">
        {detail.latestRecommendationId ? (
          <Link className={buttonVariants()} href={`/recommendations/${detail.latestRecommendationId}`}><Sparkles className="size-4" /> 최근 추천 결과 보기</Link>
        ) : null}
        <Link className={buttonVariants({ variant: "outline" })} href="/profile">새 프로필 분석하기</Link>
      </div>
    </main>
  );
}
