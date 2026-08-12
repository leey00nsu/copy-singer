import { ArrowLeft, CalendarDays, Music2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { presentVocalProfile, VocalProfileArtwork, VocalProfileResults } from "@/entities/vocal-profile";
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
    <div className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href="/vocal-profiles">
        <ArrowLeft className="size-4" /> 목록으로
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-8 pb-7">
        <div className="flex min-w-0 max-w-3xl items-start gap-4 sm:gap-5">
          <VocalProfileArtwork analysis={detail.profile} className="size-20 sm:size-24" profileId={detail.profile.id} />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
              Saved analysis
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-[2.25rem]">
              {detail.profile.displayName}
            </h1>
            <p className="mt-2.5 max-w-xl text-xs leading-5 text-muted-foreground">{presentation.summary}</p>
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CalendarDays className="size-3.5" /> {new Date(detail.profile.createdAt).toLocaleString("ko-KR")}
            </p>
          </div>
        </div>
        <div className="grid justify-items-start gap-4 sm:justify-items-end">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Music2 className="size-3" /> 믹싱 {detail.mixingCount}
            </Badge>
          </div>
          <VocalProfileActions
            displayName={detail.profile.displayName}
            profileId={detail.profile.id}
            latestRecommendationId={detail.latestRecommendationId}
          />
        </div>
      </div>

      <section className="py-5" aria-labelledby="source-audio-title">
        <div className="grid gap-5 lg:grid-cols-[minmax(12rem,.4fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h2 className="text-sm font-semibold" id="source-audio-title">
              제출한 보컬
            </h2>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              분석에 사용한 표준화 오디오입니다. 로그인한 본인에게만 스트리밍됩니다.
            </p>
          </div>
          <AudioWaveformPlayer label="제출한 보컬" src={detail.audioUrl} />
        </div>
      </section>

      <section className="pt-6">
        <VocalProfileResults profile={detail.profile} showSummary={false} sourceAudioSrc={detail.audioUrl} />
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3 pt-5">
        <Link className={buttonVariants({ variant: "outline" })} href="/profile">
          새 프로필 분석하기
        </Link>
      </div>
    </div>
  );
}
