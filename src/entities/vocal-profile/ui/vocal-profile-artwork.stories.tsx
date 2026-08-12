import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import type { VocalProfileArtworkAnalysis } from "../lib/artwork";
import { VocalProfileArtwork } from "./vocal-profile-artwork";

const voices: Array<{ analysis: VocalProfileArtworkAnalysis; label: string }> = [
  {
    label: "낮고 좁은 음역",
    analysis: { minMidi: 36, maxMidi: 51, medianMidi: 44, pitchStability: 0.61, voicedRatio: 0.58, rmsDb: -31 },
  },
  {
    label: "낮고 넓은 음역",
    analysis: { minMidi: 38, maxMidi: 65, medianMidi: 49, pitchStability: 0.88, voicedRatio: 0.85, rmsDb: -18 },
  },
  {
    label: "중저음 중심",
    analysis: { minMidi: 44, maxMidi: 65, medianMidi: 54, pitchStability: 0.72, voicedRatio: 0.76, rmsDb: -24 },
  },
  {
    label: "중음 안정형",
    analysis: { minMidi: 48, maxMidi: 70, medianMidi: 59, pitchStability: 0.96, voicedRatio: 0.93, rmsDb: -15 },
  },
  {
    label: "중고음 다이내믹",
    analysis: { minMidi: 51, maxMidi: 78, medianMidi: 64, pitchStability: 0.67, voicedRatio: 0.71, rmsDb: -11 },
  },
  {
    label: "높고 좁은 음역",
    analysis: { minMidi: 62, maxMidi: 76, medianMidi: 69, pitchStability: 0.9, voicedRatio: 0.88, rmsDb: -19 },
  },
  {
    label: "높고 넓은 음역",
    analysis: { minMidi: 58, maxMidi: 86, medianMidi: 73, pitchStability: 0.82, voicedRatio: 0.8, rmsDb: -13 },
  },
  {
    label: "가볍고 높은 음색",
    analysis: { minMidi: 66, maxMidi: 88, medianMidi: 78, pitchStability: 0.74, voicedRatio: 0.62, rmsDb: -28 },
  },
];

const meta = {
  title: "Entities/Vocal Profile/Voice-derived Artwork",
  component: VocalProfileArtwork,
  args: { profileId: "artwork-preview" },
  parameters: { layout: "padded" },
} satisfies Meta<typeof VocalProfileArtwork>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Palette: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
      {voices.map(({ analysis, label }, index) => (
        <article className="grid gap-3" key={label}>
          <VocalProfileArtwork
            analysis={analysis}
            className="aspect-square w-full rounded-2xl"
            profileId={`voice-${index}`}
          />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">
            중앙음 {analysis.medianMidi} · 음역 {analysis.maxMidi - analysis.minMidi}st
          </p>
        </article>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByText(/중앙음/)).toHaveLength(8);
    const artwork = [...canvasElement.querySelectorAll<HTMLElement>("[data-profile-artwork]")];
    await expect(artwork).toHaveLength(8);
    await expect(new Set(artwork.map((item) => item.style.backgroundColor)).size).toBeGreaterThan(5);
    await expect(canvasElement.querySelectorAll('[data-artwork-grain="fine"]')).toHaveLength(8);
    await expect(canvasElement.querySelectorAll('[data-artwork-grain="coarse"]')).toHaveLength(8);
    const fineGrain = canvasElement.querySelector<HTMLElement>('[data-artwork-grain="fine"]');
    const coarseGrain = canvasElement.querySelector<HTMLElement>('[data-artwork-grain="coarse"]');
    await expect(fineGrain).not.toBeNull();
    await expect(coarseGrain).not.toBeNull();
    await expect(getComputedStyle(fineGrain as HTMLElement).opacity).toBe("0.2");
    await expect(getComputedStyle(coarseGrain as HTMLElement).opacity).toBe("0.05");
  },
};
