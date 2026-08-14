import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { CSSProperties } from "react";
import { expect, userEvent, within } from "storybook/test";

import { type VocalProfileResponse, VocalProfileResults } from "@/entities/vocal-profile";

const PROFILE: VocalProfileResponse = {
  id: "62fae3c1-45f0-4ed8-85bd-2809ac95cde9",
  sourceType: "USER",
  profileNumber: 1,
  displayName: "보컬 프로필 1",
  minMidi: 52,
  maxMidi: 76,
  p10Midi: 56,
  medianMidi: 64,
  p90Midi: 72,
  tessituraLowMidi: 57,
  tessituraHighMidi: 70,
  voicedRatio: 0.84,
  pitchStability: 0.91,
  clippingRatio: 0,
  rmsDb: -18.6,
  analyzer: "vocal-profile-modal",
  analyzerVersion: "1.2.0",
  createdAt: "2026-08-07T00:00:00.000Z",
  descriptors: {
    pitchHistogram: [
      { midi: 55, count: 8, ratio: 0.08 },
      { midi: 58, count: 14, ratio: 0.14 },
      { midi: 60, count: 21, ratio: 0.21 },
      { midi: 64, count: 28, ratio: 0.28 },
      { midi: 67, count: 17, ratio: 0.17 },
      { midi: 70, count: 9, ratio: 0.09 },
      { midi: 72, count: 3, ratio: 0.03 },
    ],
    pitchTrack: [
      { timeMs: 0, midi: null },
      { timeMs: 250, midi: 58 },
      { timeMs: 500, midi: 60 },
      { timeMs: 750, midi: 64 },
      { timeMs: 1_000, midi: 67 },
      { timeMs: 1_250, midi: 70 },
      { timeMs: 1_500, midi: 68 },
      { timeMs: 1_750, midi: 64 },
      { timeMs: 2_000, midi: null },
    ],
  },
  recording: {
    id: "3162ae0b-3de4-47fe-9292-af18c353950b",
    mimeType: "audio/webm",
    sizeBytes: 1_420_000,
    durationMs: 42_600,
    sampleRate: 48_000,
    expiresAt: null,
    createdAt: "2026-08-07T00:00:00.000Z",
  },
};

const NO_NETWORK_AUDIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
const MISSING_CHART_TOKEN_STYLE = {
  "--brand-chart-violet": "initial",
  "--brand-chart-blue": "initial",
  "--brand-chart-pink": "initial",
} as CSSProperties;

const meta = {
  title: "Entities/Vocal Profile/VocalProfileResults",
  component: VocalProfileResults,
  args: {
    profile: PROFILE,
    sourceAudioSrc: NO_NETWORK_AUDIO,
  },
  argTypes: {
    profile: {
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-[72rem] px-5 py-10 sm:px-7 lg:px-8 lg:py-12">
        <section className="mt-10 sm:mt-14">
          <Story />
        </section>
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof VocalProfileResults>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RepresentativeAnalysis: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: /전체 관측 음역/ })).toBeVisible();
    await expect(canvas.getByRole("img", { name: "음정별 상대 빈도 막대그래프" })).toBeVisible();
    const signalGradients = Array.from(canvasElement.querySelectorAll("[data-brand-signal-gradient]"));
    await expect(signalGradients).toHaveLength(3);
    const rangeLegend = canvasElement.querySelector<HTMLElement>("[data-vocal-range-legend]");
    await expect(rangeLegend).not.toBeNull();
    await expect(rangeLegend?.querySelectorAll("[data-range-legend]")).toHaveLength(2);
    await expect(within(rangeLegend as HTMLElement).queryByText("중앙음")).not.toBeInTheDocument();
    await expect(canvasElement.querySelector("[data-observed-range-tone]")).toHaveAttribute(
      "data-observed-range-tone",
      "context",
    );
    const observedLegend = canvasElement.querySelector<HTMLElement>("[data-range-legend-swatch='observed']");
    await expect(observedLegend).not.toBeNull();
    await expect(getComputedStyle(observedLegend as HTMLElement).backgroundColor).toContain("0.9");
    await userEvent.hover(canvas.getByRole("img", { name: /전체 관측 음역/ }));
    await expect(canvasElement.querySelector(".recharts-tooltip-cursor")).not.toBeInTheDocument();
    const editorialSections = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-vocal-profile-section]"));
    await expect(editorialSections.length).toBeGreaterThan(0);
    for (const section of editorialSections) {
      await expect(getComputedStyle(section).borderTopWidth).toBe("0px");
      await expect(getComputedStyle(section).borderBottomWidth).toBe("0px");
    }
    await expect(canvasElement.querySelectorAll("[data-vocal-profile-stat-surface]")).toHaveLength(2);
    const chapters = canvasElement.querySelectorAll<HTMLElement>("[data-vocal-profile-chapter]");
    await expect(chapters).toHaveLength(3);
    for (const chapter of chapters) {
      await expect(chapter).toHaveClass("bg-muted/55");
      await expect(getComputedStyle(chapter).borderTopWidth).toBe("0px");
      await expect(getComputedStyle(chapter).borderRadius).not.toBe("0px");
      await expect(getComputedStyle(chapter).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    }
    for (const gradient of signalGradients) {
      await expect(
        Array.from(gradient.querySelectorAll("stop")).map((stop) => getComputedStyle(stop).stopColor),
      ).toEqual(["oklch(0.74 0.12 293)", "oklch(0.76 0.09 260)", "oklch(0.78 0.08 330)"]);
    }
    await expect(canvas.getByText("상세 피치 추적")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "시간에 따른 보컬 피치 추적 그래프" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /상세 피치 추적/ })).not.toBeInTheDocument();
  },
};

export const DarkBrandSignal: Story = {
  decorators: [
    (Story) => (
      <div className="dark bg-background p-6 text-foreground">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const rangeGradient = canvasElement.querySelector("[data-brand-signal-gradient='vocal-range']");
    const observedLegend = canvasElement.querySelector<HTMLElement>("[data-range-legend-swatch='observed']");
    await expect(rangeGradient).not.toBeNull();
    await expect(observedLegend).not.toBeNull();
    await expect(getComputedStyle(observedLegend as HTMLElement).backgroundColor).toContain("0.38");
    await expect(
      Array.from((rangeGradient as SVGLinearGradientElement).querySelectorAll("stop")).map(
        (stop) => getComputedStyle(stop).stopColor,
      ),
    ).toEqual(["oklch(0.8 0.1 293)", "oklch(0.81 0.08 250)", "oklch(0.82 0.08 330)"]);
  },
};

export const MissingTokenFallback: Story = {
  decorators: [
    (Story) => (
      <div className="bg-background p-6 text-foreground" style={MISSING_CHART_TOKEN_STYLE}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const rangeGradient = canvasElement.querySelector("[data-brand-signal-gradient='vocal-range']");
    const swatch = canvasElement.querySelector<HTMLElement>("[data-range-legend-swatch='practical']");
    await expect(rangeGradient).not.toBeNull();
    await expect(swatch).not.toBeNull();
    await expect(
      Array.from((rangeGradient as SVGLinearGradientElement).querySelectorAll("stop")).map(
        (stop) => getComputedStyle(stop).stopColor,
      ),
    ).toEqual(["oklch(0.74 0.12 293)", "oklch(0.76 0.09 260)", "oklch(0.78 0.08 330)"]);
    await expect(getComputedStyle(swatch as HTMLElement).backgroundImage).not.toBe("none");
  },
};

export const LowConfidenceGuidance: Story = {
  args: {
    profile: {
      ...PROFILE,
      descriptors: {
        synthesisReference: {
          version: "smart-reference-v1",
          status: "unavailable",
        },
      },
    },
    sourceAudioSrc: NO_NETWORK_AUDIO,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/안정적인 저음·중앙·고음 구간을 충분히 찾지 못했어요/)).toBeVisible();
  },
};

export const LegacyGuidance: Story = {
  args: {
    profile: {
      ...PROFILE,
      descriptors: {},
    },
    sourceAudioSrc: NO_NETWORK_AUDIO,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/새 보컬 프로필을 만들어 주세요/)).toBeVisible();
  },
};
