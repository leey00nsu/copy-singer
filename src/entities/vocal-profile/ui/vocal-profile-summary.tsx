import { Activity, AudioWaveform, Gauge, Target } from "lucide-react";
import { presentVocalProfile } from "../lib/presentation";
import type { VocalProfileResponse } from "../model/contract";

export function VocalProfileSummary({ profile }: { profile: VocalProfileResponse }) {
  const presentation = presentVocalProfile(profile);
  const metrics = [
    [
      "전체 관측 음역",
      presentation.observedRange.label,
      `${presentation.observedRange.semitones.toFixed(1)} semitone`,
      AudioWaveform,
    ],
    [
      "실용 음역",
      presentation.practicalRange.label,
      `${presentation.practicalRange.semitones.toFixed(1)} semitone`,
      Target,
    ],
    ["중심 음", presentation.median.label, `${presentation.median.midi.toFixed(1)} MIDI`, Gauge],
    ["피치 안정도", `${presentation.stability.percent}%`, presentation.stability.label, Activity],
  ] as const;

  return (
    <section aria-labelledby="vocal-profile-summary-title" className="py-8 sm:py-10">
      <p className="text-xs font-semibold tracking-[0.18em] text-data-accent-foreground">VOICE PROFILE</p>
      <div className="mt-3 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,.8fr)] lg:items-end">
        <div>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-4xl" id="vocal-profile-summary-title">
            {presentation.label}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{presentation.summary}</p>
        </div>
        <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-3" aria-label="관찰된 보컬 특징">
          {presentation.traits.map((trait) => (
            <li key={trait.id}>
              <p className="text-sm font-medium">{trait.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{trait.description}</p>
            </li>
          ))}
        </ul>
      </div>
      <dl
        className="mt-8 grid gap-6 rounded-2xl bg-muted/25 px-5 py-6 sm:grid-cols-2 xl:grid-cols-4"
        data-vocal-profile-stat-surface="summary"
      >
        {metrics.map(([label, value, detail, Icon]) => {
          return (
            <div key={label}>
              <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-3.5 text-data-accent-foreground" aria-hidden="true" /> {label}
              </dt>
              <dd className="mt-2 text-lg font-semibold tracking-tight">{value}</dd>
              <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
