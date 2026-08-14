import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, within } from "storybook/test";
import type { VocalProfileResponse } from "@/entities/vocal-profile";
import { ProductShell } from "@/widgets/product-shell";
import { notificationListHandler, ticketBalanceHandler } from "../../../../tests/msw/handlers";
import { VocalProfileDetailContent } from "./vocal-profile-detail-content";

const NO_NETWORK_AUDIO = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";

const profile: VocalProfileResponse = {
  id: "0198be62-667c-7a90-87a5-57d65f245c13",
  sourceType: "USER",
  profileNumber: 13,
  displayName: "보컬 프로필 13",
  minMidi: 56,
  maxMidi: 63,
  p10Midi: 56,
  medianMidi: 58,
  p90Midi: 63,
  tessituraLowMidi: 56,
  tessituraHighMidi: 63,
  voicedRatio: 0.82,
  pitchStability: 0.91,
  clippingRatio: 0,
  rmsDb: -18.4,
  analyzer: "storybook",
  analyzerVersion: "1",
  descriptors: {
    pitchHistogram: [
      { midi: 56, count: 8, ratio: 0.12 },
      { midi: 57, count: 14, ratio: 0.2 },
      { midi: 58, count: 18, ratio: 0.26 },
      { midi: 60, count: 13, ratio: 0.19 },
      { midi: 61, count: 10, ratio: 0.14 },
      { midi: 63, count: 6, ratio: 0.09 },
    ],
    pitchTrack: [
      { timeMs: 0, midi: null },
      { timeMs: 250, midi: 56 },
      { timeMs: 500, midi: 58 },
      { timeMs: 750, midi: 60 },
      { timeMs: 1_000, midi: 63 },
      { timeMs: 1_250, midi: 61 },
      { timeMs: 1_500, midi: 58 },
      { timeMs: 1_750, midi: null },
    ],
  },
  createdAt: "2026-08-11T11:37:25.000Z",
  recording: {
    id: "0198be62-667c-7a90-87a5-57d65f245c14",
    mimeType: "audio/wav",
    sizeBytes: 2_048_000,
    durationMs: 60_000,
    sampleRate: 48_000,
    expiresAt: null,
    createdAt: "2026-08-11T11:37:25.000Z",
  },
};

const meta = {
  title: "Pages/Vocal Profile Detail",
  component: VocalProfileDetailContent,
  args: {
    detail: {
      profile,
      mixingCount: 3,
      audioUrl: NO_NETWORK_AUDIO,
    },
  },
  decorators: [
    (Story) => (
      <ProductShell user={{ email: "jieun@copysinger.test", name: "지은" }}>
        <Story />
      </ProductShell>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: `/vocal-profiles/${profile.id}` } },
  },
  beforeEach({ msw }) {
    msw.use(notificationListHandler(), ticketBalanceHandler());
  },
} satisfies Meta<typeof VocalProfileDetailContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Saved analysis")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "보컬 프로필 13" })).toBeVisible();
    await expect(canvas.getByText("믹싱 3")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "이름 변경" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "추천 결과 보기" })).toHaveAttribute(
      "href",
      `/recommendations/${profile.id}`,
    );
    await expect(canvas.getByRole("button", { name: "삭제" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "제출한 보컬" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "보컬 분석 결과" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "새 프로필 분석하기" })).toHaveAttribute("href", "/profile");
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "보컬 프로필 13" })).toBeVisible();
    await expect(canvas.getByText("믹싱 3")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "제출한 보컬" })).toBeVisible();
  },
};
