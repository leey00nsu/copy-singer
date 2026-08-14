import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { type AdminCatalogEntryView, CatalogManager } from "@/features/manage-song-catalog";

const replacementSource: AdminCatalogEntryView["song"]["sources"][number] = {
  id: "source-2",
  revision: 2,
  sourceUrl: "https://youtu.be/HdTUQhHHJEg",
  sourceVideoId: "HdTUQhHHJEg",
  sourceLabel: "교체 영상",
  status: "DRAFT",
  analysisStatus: "SUCCEEDED",
  analysisError: null,
  analysisReady: true,
  estimatedKey: "C#m",
  keyConfidence: 0.42,
  targetReady: false,
};

const readyEntry: AdminCatalogEntryView = {
  id: "entry-47",
  position: 47,
  status: "PUBLISHED",
  song: {
    id: "song-47",
    title: "너였다면",
    artist: "정승환",
    originalKey: null,
    lifecycleStatus: "ACTIVE",
    activeSourceId: "source-1",
    currentAnalysisId: "analysis-1",
    targetAssetId: "target-1",
    sources: [
      replacementSource,
      {
        id: "source-1",
        revision: 1,
        sourceUrl: "https://youtu.be/WABhOy9wm3c",
        sourceVideoId: "WABhOy9wm3c",
        sourceLabel: "기존 영상",
        status: "READY",
        analysisStatus: "SUCCEEDED",
        analysisError: null,
        analysisReady: true,
        estimatedKey: "F#",
        keyConfidence: 0.38,
        targetReady: true,
      },
    ],
  },
};

const failedEntry: AdminCatalogEntryView = {
  ...readyEntry,
  id: "entry-62",
  position: 62,
  song: {
    ...readyEntry.song,
    id: "song-62",
    title: "실패한 분석 예시",
    lifecycleStatus: "DRAFT",
    sources: [
      {
        ...replacementSource,
        id: "source-failed",
        sourceVideoId: "vepz3RlTd4M",
        sourceUrl: "https://youtu.be/vepz3RlTd4M",
        analysisStatus: "FAILED",
        analysisError: "PIPELINE_TIMEOUT",
        analysisReady: false,
        estimatedKey: null,
        keyConfidence: null,
      },
    ],
  },
};

const EXPECTED_AUDIO_ACCEPT =
  ".wav,.mp3,.m4a,.webm,audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,audio/webm";
const EXPECTED_AUDIO_FORMAT_HINT = "지원 형식: WAV · MP3 · M4A · WEBM";

const meta = {
  title: "Features/Manage Song Catalog/CatalogManager",
  component: CatalogManager,
  args: { entries: [readyEntry, failedEntry] },
  parameters: { layout: "padded" },
} satisfies Meta<typeof CatalogManager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("너였다면")).toBeVisible();
    await userEvent.click(canvas.getByText("너였다면"));
    await expect(canvas.getByText("PIPELINE_TIMEOUT")).not.toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /^공개$/ })[0]).toBeDisabled();
  },
};

export const Empty: Story = {
  args: { entries: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("조건에 맞는 곡이 없습니다.")).toBeVisible();
  },
};

export const AddAudioDialog: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "음원 추가" }));
    const dialog = within(document.body).getByRole("dialog", { name: "음원 추가" });
    const audioInput = within(dialog).getByLabelText("분석 및 믹싱용 음원");
    await expect(within(dialog).getByRole("textbox", { name: "곡 제목" })).toBeEnabled();
    await expect(within(dialog).queryByRole("textbox", { name: "원키" })).not.toBeInTheDocument();
    await expect(within(dialog).queryByRole("textbox", { name: "Video ID" })).not.toBeInTheDocument();
    await expect(audioInput).toBeRequired();
    await expect(audioInput).toHaveAttribute("accept", EXPECTED_AUDIO_ACCEPT);
    await waitFor(() => expect(within(dialog).getByText(EXPECTED_AUDIO_FORMAT_HINT)).toBeVisible());
    await expect(within(dialog).getByRole("button", { name: "등록 및 분석 요청" })).toBeEnabled();
  },
};

export const ExistingAudioInputsUseSameFormats: Story = {
  args: { entries: [readyEntry] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("너였다면"));

    const targetInputs = canvas.getAllByLabelText("믹싱 target 음원");
    for (const input of targetInputs) await expect(input).toHaveAttribute("accept", EXPECTED_AUDIO_ACCEPT);
    await expect(canvas.getByLabelText("교체 음원")).toHaveAttribute("accept", EXPECTED_AUDIO_ACCEPT);
    await expect(canvas.getAllByText(EXPECTED_AUDIO_FORMAT_HINT)).toHaveLength(targetInputs.length + 1);
  },
};

export const ErrorAndRetry: Story = {
  args: { entries: [failedEntry] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("실패한 분석 예시"));
    await expect(canvas.getByText("PIPELINE_TIMEOUT")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "재시도" })).toBeEnabled();
  },
};

export const LoadingAndDisabled: Story = {
  args: { loading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "음원 추가" })).toBeDisabled();
  },
};

export const Mobile: Story = {
  args: { entries: [readyEntry] },
  parameters: { viewport: { value: "mobile1", isRotated: false } },
};
