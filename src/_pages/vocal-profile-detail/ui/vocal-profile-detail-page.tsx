import { ArrowLeft, CalendarDays, Music2, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { presentVocalProfile, VocalProfileResults } from "@/entities/vocal-profile";
import { getVocalProfileDetail } from "@/entities/vocal-profile/index.server";
import { requirePageSession } from "@/features/authentication/index.server";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { VocalProfileActions } from "./vocal-profile-actions";

export default async function VocalProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePageSession(`/vocal-profiles/${id}`);
  const detail = await getVocalProfileDetail(session.user.id, id);
  if (!detail) notFound();
  const presentation = presentVocalProfile(detail.profile);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/vocal-profiles">
        <ArrowLeft className="size-4" /> 목록으로
      </Link>
      <div className="mt-7 flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">SAVED ANALYSIS</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{presentation.label}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{presentation.summary}</p>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" /> {new Date(detail.profile.createdAt).toLocaleString("ko-KR")}
          </p>
        </div>
        <div className="grid justify-items-start gap-4 sm:justify-items-end">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Sparkles className="size-3" /> 추천 {detail.recommendationCount}
            </Badge>
            <Badge variant="secondary">
              <Music2 className="size-3" /> 믹싱 {detail.mixingCount}
            </Badge>
          </div>
          <VocalProfileActions profileId={detail.profile.id} latestRecommendationId={detail.latestRecommendationId} />
        </div>
      </div>

      <section className="mt-10 border-y py-6" aria-labelledby="source-audio-title">
        <div className="grid gap-5 lg:grid-cols-[minmax(14rem,.45fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h2 className="text-lg font-semibold" id="source-audio-title">
              제출한 보컬
            </h2>
            <p className="text-sm text-muted-foreground">
              분석에 사용한 표준화 오디오입니다. 로그인한 본인에게만 스트리밍됩니다.
            </p>
          </div>
          <AudioWaveformPlayer label="제출한 보컬" src={detail.audioUrl} />
        </div>
      </section>

      <section className="mt-8">
        <VocalProfileResults profile={detail.profile} showSummary={false} sourceAudioSrc={detail.audioUrl} />
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-end gap-3 border-t pt-6">
        <Link className={buttonVariants({ variant: "outline" })} href="/profile">
          새 프로필 분석하기
        </Link>
      </div>
    </div>
  );
}
