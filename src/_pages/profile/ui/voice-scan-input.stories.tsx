import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { RecorderSurface } from "./vocal-profile-recorder";
import { VoiceScanInput } from "./voice-scan-input";

const noop = fn();
const EXPECTED_AUDIO_ACCEPT =
  ".wav,.mp3,.m4a,.webm,audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,audio/webm";

function RecorderTransitionPreview() {
  const [state, setState] = useState<"idle" | "recording">("idle");

  return (
    <RecorderSurface
      elapsedMs={state === "recording" ? 1_200 : 0}
      maxDurationMs={60_000}
      onCancel={() => setState("idle")}
      onStart={() => setState("recording")}
      onStop={() => setState("idle")}
      state={state}
    />
  );
}

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
      <div className="w-[min(100vw-2.5rem,35.5rem)]">
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
    await expect(canvas.getByRole("button", { name: "마이크로 녹음 시작" })).toBeVisible();
    await expect(canvas.getByLabelText("오디오 파일 업로드")).toHaveAttribute("accept", EXPECTED_AUDIO_ACCEPT);
    await expect(canvas.getByText("지원 형식: WAV · MP3 · M4A · WEBM · 최대 25MB / 60초")).toBeVisible();
    await expect(canvas.queryByTestId("recording-elapsed-time")).not.toBeInTheDocument();
    const surface = canvas.getByRole("img", { name: "녹음 대기 상태" });
    await expect(surface).toHaveAttribute("data-recorder-visual-state", "idle");
    await expect(getComputedStyle(surface).borderTopWidth).toBe("0px");
    await expect(getComputedStyle(surface).transitionProperty).toContain("height");
    await expect(getComputedStyle(canvas.getByTestId("voice-orb")).filter).toContain("grayscale(1)");
  },
};

export const LiveMicrophone: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "마이크로 녹음 시작" })).toBeVisible();
    await expect(canvas.getByRole("img", { name: "녹음 대기 상태" })).toBeVisible();
    await expect(canvas.getByTestId("voice-signal-core")).toHaveAttribute("data-signal-mode", "idle");
    await expect(canvas.getByTestId("voice-orb")).toBeVisible();
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
    await expect(canvas.getByTestId("recording-elapsed-time")).toHaveTextContent("0:12.4");
    await expect(canvas.getByRole("img", { name: "실시간 마이크 입력 반응과 파형" })).toBeVisible();
    await expect(canvas.getByTestId("voice-signal-core")).toHaveAttribute("data-signal-mode", "recording");
    const waveform = canvas.getByTestId("recording-scrolling-waveform");
    await waitFor(() => expect(waveform).toBeVisible());
    await expect(waveform).toHaveAttribute("data-waveform-gradient", "brand");
    await expect(waveform).toHaveAttribute("data-waveform-source", "elevenlabs-ui-scrolling-waveform");
    await expect(getComputedStyle(waveform).animationName).not.toBe("none");
    const surface = canvas.getByRole("img", { name: "실시간 마이크 입력 반응과 파형" });
    await expect(surface).toHaveAttribute("data-recorder-visual-state", "recording");
    await expect(getComputedStyle(surface).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    await expect(getComputedStyle(surface).borderTopWidth).toBe("0px");
  },
};

export const RecordingTransition: Story = {
  render: () => <RecorderTransitionPreview />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const idleOrb = canvas.getByTestId("voice-orb");
    await expect(canvas.queryByTestId("recording-elapsed-time")).not.toBeInTheDocument();
    await waitFor(() => expect(idleOrb.querySelector("canvas")).not.toBeNull());
    const shaderCanvas = idleOrb.querySelector("canvas");

    await userEvent.click(canvas.getByRole("button", { name: "마이크로 녹음 시작" }));

    await expect(canvas.getByRole("img", { name: "실시간 마이크 입력 반응과 파형" })).toBeVisible();
    await expect(canvas.getByTestId("recording-elapsed-time")).toHaveTextContent("0:01.2");
    await waitFor(() => expect(canvas.getByTestId("recording-scrolling-waveform")).toBeVisible());
    await expect(canvas.getByTestId("voice-orb").querySelector("canvas")).toBe(shaderCanvas);
  },
};

export const RequestingPermission: Story = {
  args: {
    recorderState: "requesting_permission",
    recorderOverride: (
      <RecorderSurface
        elapsedMs={0}
        maxDurationMs={60_000}
        onCancel={noop}
        onStart={noop}
        onStop={noop}
        state="requesting_permission"
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("마이크 권한을 확인하는 중…")).toBeVisible();
    await expect(canvas.getByRole("img", { name: "마이크 연결 상태" })).toBeVisible();
    await expect(canvas.getByTestId("voice-signal-core")).toHaveAttribute("data-signal-mode", "requesting");
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
    const canvas = within(canvasElement);
    const progress = canvas.getByRole("progressbar", { name: "오디오 준비" });
    const track = progress.querySelector<HTMLElement>('[data-slot="progress-track"]');
    const indicator = progress.querySelector<HTMLElement>('[data-slot="progress-indicator"]');
    if (!track || !indicator) throw new Error("Preparing progress track or indicator is missing.");
    await expect(canvas.getByText("46%")).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuenow", "46");
    await expect(indicator.style.width).toBe("46%");
    await expect(getComputedStyle(indicator).transitionDuration).toBe("0s");
    await expect(indicator.getBoundingClientRect().width / track.getBoundingClientRect().width).toBeCloseTo(0.46, 1);
  },
};

export const PreparingComplete: Story = {
  args: {
    preparing: true,
    preparationProgress: 1,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const progress = canvas.getByRole("progressbar", { name: "오디오 준비" });
    const track = progress.querySelector<HTMLElement>('[data-slot="progress-track"]');
    const indicator = progress.querySelector<HTMLElement>('[data-slot="progress-indicator"]');
    if (!track || !indicator) throw new Error("Completed progress track or indicator is missing.");
    await expect(canvas.getByText("100%")).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuenow", "100");
    await expect(indicator.style.width).toBe("100%");
    await expect(getComputedStyle(indicator).transitionDuration).toBe("0s");
    await expect(indicator.getBoundingClientRect().width).toBe(track.getBoundingClientRect().width);
  },
};

export const Ready: Story = {
  args: {
    audioDuration: 8.2,
    audioFile: { name: "birthday-song-voice.webm", size: 860_000 } as File,
    audioPreview: (
      <div
        aria-label="제출할 보컬 녹음 파형"
        className="mt-5 flex h-24 items-center justify-center rounded-lg bg-accent/30"
        role="img"
      >
        <span className="text-sm text-data-accent-foreground">준비된 오디오 파형</span>
      </div>
    ),
    audioUrl: "blob:storybook-voice-scan",
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("분석할 오디오가 준비됐어요")).toBeVisible();
    await expect(canvas.getByTestId("audio-duration-notice")).toHaveAttribute("data-audio-status", "valid");
    await userEvent.click(canvas.getByRole("button", { name: "내 보컬 프로필 만들기" }));
    await expect(args.onAnalyze).toHaveBeenCalledOnce();
  },
};

export const TooShort: Story = {
  args: {
    audioDuration: 3.2,
    audioFile: { name: "short-voice.webm", size: 320_000 } as File,
    audioPreview: <div aria-label="짧은 보컬 녹음" className="mt-5 h-24 rounded-lg bg-muted/40" role="img" />,
    audioUrl: "blob:storybook-short-voice-scan",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const notice = canvas.getByRole("alert");
    await expect(notice).toHaveTextContent("5초보다 짧아요");
    await expect(notice).toHaveAttribute("data-audio-status", "invalid");
    await expect(canvas.getByRole("button", { name: "내 보컬 프로필 만들기" })).toBeDisabled();
  },
};
