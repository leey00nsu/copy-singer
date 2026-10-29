import { ArrowLeft, CalendarDays, Music2 } from "lucide-react";
import Link from "next/link";
import {
  presentVocalProfile,
  VocalProfileArtwork,
  type VocalProfileResponse,
  VocalProfileResults,
} from "@/entities/vocal-profile";
import { AudioWaveformPlayer } from "@/shared/ui/audio-waveform-player";
import { Badge } from "@/shared/ui/badge";
import { buttonVariants } from "@/shared/ui/button";
import { VocalProfileActions } from "./vocal-profile-actions";

export type VocalProfileDetailContentProps = {
  guest?: boolean;
  signedIn?: boolean;
  detail: {
    profile: VocalProfileResponse;
    mixingCount: number;
    audioUrl: string;
  };
};

export function VocalProfileDetailContent({ detail, guest = false, signedIn = false }: VocalProfileDetailContentProps) {
  const presentation = presentVocalProfile(detail.profile);

  return (
    <div className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12">
      <Link className={buttonVariants({ size: "sm", variant: "ghost" })} href={guest ? "/" : "/library?tab=profiles"}>
        <ArrowLeft className="size-4" /> {guest ? "홈으로" : "목록으로"}
      </Link>
      <div className="mt-6 pb-7">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-data-accent-foreground uppercase">
          {guest ? "무료 분석 결과" : "Saved analysis"}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-8">
          <div className="flex min-w-0 max-w-3xl items-start gap-4 sm:gap-5">
            <VocalProfileArtwork
              analysis={detail.profile}
              className="size-20 sm:size-24"
              profileId={detail.profile.id}
            />
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-[2.25rem]">
                {guest ? "내 목소리 분석 결과" : detail.profile.displayName}
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
                {guest ? (
                  "무료 분석 1회"
                ) : (
                  <>
                    <Music2 className="size-3" /> 믹싱 {detail.mixingCount}
                  </>
                )}
              </Badge>
            </div>
            {!guest ? (
              <VocalProfileActions displayName={detail.profile.displayName} profileId={detail.profile.id} />
            ) : null}
          </div>
        </div>
      </div>

      <section className="py-5" aria-labelledby="source-audio-title">
        <div>
          <h2 className="text-sm font-semibold" id="source-audio-title">
            제출한 보컬
          </h2>
          <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">분석에 사용한 오디오예요.</p>
        </div>
        <AudioWaveformPlayer className="mt-5" label="제출한 보컬" src={detail.audioUrl} />
      </section>

      <section aria-labelledby="vocal-analysis-title" className="mt-10 sm:mt-14">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl" id="vocal-analysis-title">
            보컬 분석 결과
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            음역과 음정 분포, 녹음 정보를 한 번에 확인할 수 있어요.
          </p>
        </div>
        <VocalProfileResults profile={detail.profile} sourceAudioSrc={detail.audioUrl} />
      </section>

      {guest ? (
        <section aria-label="분석 결과 저장" className="mt-10 grid gap-4 rounded-xl border p-5 sm:p-6">
          <h2 className="text-lg font-semibold">내 분석 결과를 저장해 보세요.</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            결과는 분석 완료 후 24시간 동안 보관돼요. 계정에 저장한 프로필로 노래 추천과 AI 믹싱을 이용할 수 있어요.
          </p>
          <VocalProfileActions
            displayName={detail.profile.displayName}
            profileId={detail.profile.id}
            guest
            signedIn={signedIn}
          />
        </section>
      ) : (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-3 pt-5">
          <Link className={buttonVariants({ variant: "outline" })} href="/profile">
            새 프로필 분석하기
          </Link>
        </div>
      )}
    </div>
  );
}
