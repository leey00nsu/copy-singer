import { AudioLines, Mic2, ShieldCheck, Timer, Upload } from "lucide-react";
import { StatusNotice } from "@/shared/ui/status-notice";

const recordingGuides = [
  { icon: Mic2, title: "반주 없이", description: "목소리만 들리게 불러주세요." },
  { icon: Timer, title: "10초 정도", description: "한 소절이면 충분해요." },
  { icon: AudioLines, title: "무리하지 않게", description: "고음이나 저음을 억지로 내지 않아도 돼요." },
  { icon: Upload, title: "파일도 OK", description: "녹음해 둔 오디오를 올려도 돼요." },
] as const;

export function VoiceScanGuide() {
  return (
    <section aria-labelledby="voice-scan-guide-title" className="mt-10">
      <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">HOW TO RECORD</p>
      <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em]" id="voice-scan-guide-title">
        아는 노래 한 소절을 편하게 불러주세요.
      </h2>
      <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
        어떤 노래든 괜찮아요. 무리하지 말고 평소 목소리로 불러주세요.
      </p>
      <ol className="mt-5 grid gap-2.5">
        {recordingGuides.map(({ description, icon: Icon, title }) => (
          <li className="flex gap-3 rounded-lg border px-4 py-3.5" key={title}>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md border border-data-accent/15 bg-data-accent/[0.08] text-data-accent-foreground"
              data-voice-guide-icon={title}
            >
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
            </div>
          </li>
        ))}
      </ol>
      <StatusNotice
        className="mt-5"
        description="이 결과는 노래 · 키 추천을 위한 참고값이며 의료적 진단이 아니에요. 본인에게 사용 권한이 있는 음성만 제출해 주세요."
        icon={<ShieldCheck />}
      />
    </section>
  );
}
