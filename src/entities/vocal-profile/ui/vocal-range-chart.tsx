"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/shared/ui/chart";

import { VOCAL_CHART_COLOR } from "../lib/chart-brand";
import { midiToNoteName } from "../model/pitch";
import { midiAxis, rangeChartData, type VocalRangeMetrics } from "../model/visualization";

const RANGE_CHART_CONFIG = {
  range: { label: "음역", color: "var(--data-accent)" },
} satisfies ChartConfig;

function VocalRangeChart({
  className = "h-36 w-full aspect-auto",
  profile,
}: {
  className?: string;
  profile: VocalRangeMetrics & { medianMidi?: number | null };
}) {
  const gradientSeed = useId().replaceAll(":", "");
  const practicalGradientId = `${gradientSeed}-practical-range`;
  const axis = midiAxis(profile.minMidi, profile.maxMidi);
  const data = rangeChartData(profile);
  const medianMidi =
    typeof profile.medianMidi === "number" && Number.isFinite(profile.medianMidi) ? profile.medianMidi : null;

  return (
    <ChartContainer
      aria-label={`전체 관측 음역 ${midiToNoteName(profile.minMidi)}부터 ${midiToNoteName(profile.maxMidi)}, 실용 음역 ${midiToNoteName(profile.tessituraLowMidi)}부터 ${midiToNoteName(profile.tessituraHighMidi)}${medianMidi === null ? "" : `, 중앙음 ${midiToNoteName(medianMidi)}`}`}
      className={className}
      config={RANGE_CHART_CONFIG}
      data-observed-range-tone="muted"
      role="img"
    >
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 18, top: 30, bottom: 8 }}>
        <defs>
          <linearGradient data-brand-signal-gradient="vocal-range" id={practicalGradientId} x1="0%" x2="100%">
            <stop offset="0%" style={{ stopColor: VOCAL_CHART_COLOR.violet }} />
            <stop offset="50%" style={{ stopColor: VOCAL_CHART_COLOR.blue }} />
            <stop offset="100%" style={{ stopColor: VOCAL_CHART_COLOR.pink }} />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} strokeDasharray="4 4" />
        <XAxis
          dataKey="range"
          domain={[axis.low, axis.high]}
          tickFormatter={(value) => midiToNoteName(Number(value))}
          type="number"
        />
        <YAxis dataKey="label" hide type="category" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(_, __, item) => {
                const row = item.payload as (typeof data)[number];
                return (
                  <div className="grid gap-1">
                    <span className="font-medium">{row.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {row.lowNote} – {row.highNote} · {row.range[0].toFixed(1)}–{row.range[1].toFixed(1)} MIDI
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        {medianMidi !== null ? (
          <ReferenceLine
            label={{ value: `중앙음 ${midiToNoteName(medianMidi)}`, position: "top", fontSize: 10 }}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            x={medianMidi}
          />
        ) : null}
        <Bar dataKey="range" radius={8}>
          {data.map((row) => (
            <Cell fill={row.key === "observed" ? "var(--muted)" : `url(#${practicalGradientId})`} key={row.key} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export { VocalRangeChart };
