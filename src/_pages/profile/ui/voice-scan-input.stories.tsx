import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { RecorderSurface } from "./vocal-profile-recorder";
import { VoiceScanInput } from "./voice-scan-input";

const noop = fn();

const meta = {
  title: "Pages/Profile/VoiceScanInput",
  component: VoiceScanInput,
  args: {
    audioDuration: null,
    audioFile: null,
    audioUrl: null,
    onAnalyze: fn(),
    onRecordingComplete: fn(),
    onRecordingError: fn(),
    onReset: fn(),
    onSelectFile: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[min(100vw-2rem,42rem)]">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof VoiceScanInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    recorderOverride: (
      <RecorderSurface elapsedMs={0} maxDurationMs={60_000} onCancel={noop} onStart={noop} onStop={noop} state="idle" />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "마이크로 녹음" })).toBeVisible();
    await expect(canvas.getByText(/최대 25MB/)).toBeVisible();
  },
};

export const Recording: Story = {
  args: {
    recorderState: "recording",
    recorderOverride: (
      <RecorderSurface
        elapsedMs={12_400}
        maxDurationMs={60_000}
        onCancel={noop}
        onStart={noop}
        onStop={noop}
        state="recording"
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("권장 녹음 시간을 채웠어요")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "녹음 완료" })).toBeVisible();
  },
};

export const PermissionDenied: Story = {
  args: {
    recorderIssue: {
      kind: "permission_denied",
      title: "마이크 권한이 차단됐어요",
      description: "브라우저 주소창의 사이트 설정에서 마이크를 허용하거나 아래에서 오디오 파일을 업로드해주세요.",
    },
    recorderOverride: (
      <RecorderSurface
        elapsedMs={0}
        maxDurationMs={60_000}
        onCancel={noop}
        onStart={noop}
        onStop={noop}
        state="error"
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("alert")).toHaveTextContent("마이크 권한이 차단됐어요");
    await expect(canvas.getByText("오디오 파일 업로드")).toBeVisible();
  },
};

export const Preparing: Story = {
  args: {
    preparing: true,
    preparationProgress: 0.46,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("46%")).toBeVisible();
  },
};

export const Ready: Story = {
  args: {
    audioDuration: 8.2,
    audioFile: { name: "birthday-song-voice.webm", size: 860_000 } as File,
    audioPreview: (
      <div
        aria-label="제출할 보컬 녹음 파형"
        className="mt-5 flex h-24 items-center justify-center border-y bg-accent/30"
        role="img"
      >
        <span className="text-sm text-data-accent-foreground">준비된 오디오 파형</span>
      </div>
    ),
    audioUrl: "blob:storybook-voice-scan",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/5초 최소 조건을 충족/)).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "내 보컬 프로필 만들기" }));
    await expect(args.onAnalyze).toHaveBeenCalledOnce();
  },
};
