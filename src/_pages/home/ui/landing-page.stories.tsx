import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { notificationListHandler, ticketBalanceHandler } from "../../../../tests/msw/handlers";
import { LandingPage } from "./landing-page";

const meta = {
  title: "Pages/Landing",
  component: LandingPage,
  parameters: {
    layout: "fullscreen",
  },
  beforeEach({ msw }) {
    msw.use(notificationListHandler(), ticketBalanceHandler());
  },
} satisfies Meta<typeof LandingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

async function expectLandingStructure(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const bento = canvas.getByLabelText("Copysinger 제품 흐름 미리보기");
  await expect(bento.parentElement).toHaveStyle({ "--reveal-duration": "1400ms", "--reveal-opacity": "0" });
  bento.scrollIntoView({ block: "center" });
  await waitFor(() => expect(bento).toBeVisible());
  await expect(canvas.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  const gradientText = Array.from(canvasElement.querySelectorAll<HTMLElement>("[data-gradient-text]"));
  await expect(gradientText).toHaveLength(1);
  const firstGradientSegment = gradientText.at(0);
  if (!firstGradientSegment) throw new Error("Gradient Text segment를 찾지 못했습니다.");
  await expect(firstGradientSegment).toHaveTextContent("내 목소리");
  await expect(firstGradientSegment).toHaveAttribute("data-animation-speed", "1.5");
  await expect(firstGradientSegment).toHaveAttribute("data-yoyo", "true");
  const gradientParticle = firstGradientSegment
    .closest("[data-word-index]")
    ?.querySelector<HTMLElement>("[data-gradient-particle]");
  await expect(gradientParticle).toHaveTextContent("에");
  if (!gradientParticle) throw new Error("Gradient Text 조사 element를 찾지 못했습니다.");
  const gradientStyle = getComputedStyle(firstGradientSegment);
  const particleStyle = getComputedStyle(gradientParticle);
  await expect(gradientStyle.fontSize).toBe(particleStyle.fontSize);
  await expect(gradientStyle.lineHeight).toBe(particleStyle.lineHeight);
  await expect(
    Math.abs(firstGradientSegment.getBoundingClientRect().bottom - gradientParticle.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(1);
  const reducedMotionPreview = Boolean(canvasElement.querySelector('[data-testid="reduced-motion-preview"]'));
  if (!reducedMotionPreview) {
    const startPosition = firstGradientSegment.style.backgroundPosition;
    await waitFor(() => expect(firstGradientSegment.style.backgroundPosition).not.toBe(startPosition));
  }
  const analysis = canvas.getByRole("heading", { name: "목소리 분석" });
  const recommendation = canvas.getByRole("heading", { name: "노래와 키 추천" });
  const mixing = canvas.getByRole("heading", { name: "선택형 AI 믹싱" });
  await expect(analysis.compareDocumentPosition(recommendation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await expect(recommendation.compareDocumentPosition(mixing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await expect(canvas.getByRole("list", { name: "AI 믹싱 이용 흐름" })).toBeVisible();
  const albumCoverStack = canvas.getByTestId("album-cover-stack");
  await expect(albumCoverStack).toBeVisible();
  await expect(albumCoverStack.querySelectorAll("img")).toHaveLength(4);
  const firstMetric = canvas.getByText("5초+");
  firstMetric.scrollIntoView({ block: "center" });
  await waitFor(() => expect(firstMetric).toBeVisible());
  await waitFor(() => expect(canvas.getByText("60초")).toBeVisible());
  await waitFor(() => expect(canvas.getByText("3단계")).toBeVisible());
  await expect(canvasElement.querySelectorAll("[data-count-up-target]")).toHaveLength(0);
  await expect(canvas.queryByText("Sample profile")).not.toBeInTheDocument();
  await expect(canvas.queryByText("가상 데이터")).not.toBeInTheDocument();
  await expect(canvas.queryByText("VOICE SIGNAL")).not.toBeInTheDocument();
  await expect(canvasElement.querySelectorAll('[data-reveal-variant="section"]')).toHaveLength(2);
  await expect(canvasElement.querySelectorAll('[data-reveal-variant="stagger"]')).toHaveLength(2);
  await expect(canvasElement.querySelectorAll('[data-reveal-variant="line"]')).toHaveLength(1);
  await expect(canvasElement.querySelectorAll('[data-reveal-variant="line"] [data-reveal-line]')).toHaveLength(2);
  await expect(canvasElement.querySelectorAll('[data-reveal-variant="fade"]')).toHaveLength(1);
  await expect(
    canvas.getByRole("img", { name: "전체 관측 음역 E3부터 A♯5, 실용 음역 G4부터 C♯5, 중앙음 A♯4" }),
  ).toBeVisible();
  await expect(canvas.queryByTestId("recommended-key-visualizer")).not.toBeInTheDocument();
  await expect(canvasElement.querySelectorAll("h1 [aria-hidden='true'] > span")).not.toHaveLength(0);
  const voiceNotesHeading = canvas.getByRole("heading", { name: "더 좋은 한 소절을 위한 짧은 안내" });
  voiceNotesHeading.scrollIntoView({ block: "center" });
  await waitFor(() => expect(voiceNotesHeading).toBeVisible());
  await expect(canvas.queryByTestId("grainient-background")).not.toBeInTheDocument();
  const firstVoiceNote = canvas.getByRole("heading", { name: "편하게 녹음하기" });
  await waitFor(() => expect(firstVoiceNote.closest("article")).toBeVisible());
  const voiceNoteImages = Array.from(firstVoiceNote.closest("section")?.querySelectorAll("article img") ?? []);
  await expect(voiceNoteImages).toHaveLength(4);
  await expect(voiceNoteImages.map((image) => image.getAttribute("src"))).toEqual(
    expect.arrayContaining([
      expect.stringContaining("recording-aurora.webp"),
      expect.stringContaining("vocal-profile-aurora.webp"),
      expect.stringContaining("song-match-aurora.webp"),
      expect.stringContaining("ai-mixing-aurora.webp"),
    ]),
  );
  await expect(canvas.queryByText("분석에서 믹싱까지, 한 흐름으로")).not.toBeInTheDocument();
  await expect(canvas.queryByText("목소리의 범위와 안정성을 같은 기준으로")).not.toBeInTheDocument();
  const finalCtaHeading = canvas.getByRole("heading", { name: "어떻게 시작할까요?" });
  finalCtaHeading.scrollIntoView({ block: "center" });
  await waitFor(() => expect(finalCtaHeading).toBeVisible());
  await expect(canvas.getByRole("navigation", { name: "제품 푸터 메뉴" })).toBeVisible();
}

export const SignedOut: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "무료로 시작하기: 목소리 분석 시작" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Fprofile",
    );
    await expect(canvas.getByLabelText("Copysinger 제품 흐름 미리보기")).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "라이브러리 보기" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Flibrary",
    );
    await expect(canvas.queryByTestId("landing-crystal")).not.toBeInTheDocument();
    await expect(canvas.getByText("© 2026 Copysinger.")).toBeVisible();
    await expectLandingStructure(canvasElement);
  },
};

export const Mobile: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toBeVisible();
    await waitFor(
      () => expect(canvas.getByRole("button", { name: "무료로 시작하기: 목소리 분석 시작" })).toBeVisible(),
      { timeout: 2500 },
    );
    await expect(canvas.getByLabelText("Copysinger 제품 흐름 미리보기")).toBeInTheDocument();
    await expectLandingStructure(canvasElement);
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
  },
};

export const ReducedMotion: Story = {
  render: (args) => (
    <div data-testid="reduced-motion-preview">
      <style>{`
        [data-testid="reduced-motion-preview"] *,
        [data-testid="reduced-motion-preview"] *::before,
        [data-testid="reduced-motion-preview"] *::after {
          animation: none !important;
          filter: none !important;
          opacity: 1 !important;
          scroll-behavior: auto !important;
          transform: none !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
      <LandingPage {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("reduced-motion-preview")).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "무료로 시작하기: 목소리 분석 시작" })).toBeVisible();
    await expect(canvas.getByLabelText("Copysinger 제품 흐름 미리보기")).toBeInTheDocument();
    await expectLandingStructure(canvasElement);
  },
};

export const SignedIn: Story = {
  args: {
    admin: true,
    user: {
      email: "jieun@copysinger.test",
      image: null,
      name: "지은",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "목소리 분석 시작하기: 목소리 분석 시작" })).toHaveAttribute(
      "href",
      "/profile",
    );
    await expect(canvas.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    await expect(canvas.getByRole("link", { name: "라이브러리 보기" })).toHaveAttribute("href", "/library");
    await userEvent.click(canvas.getByRole("button", { name: "지은 계정 메뉴" }));
    const body = within(document.body);
    await waitFor(() => expect(body.getByRole("menuitem", { name: "내 계정" })).toBeVisible());
    await expect(body.getByRole("menuitem", { name: "관리" })).toBeVisible();
  },
};
