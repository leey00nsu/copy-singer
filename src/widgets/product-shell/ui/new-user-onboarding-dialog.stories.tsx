import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type {} from "msw-storybook-addon/types";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  onboardingCompletionErrorHandler,
  onboardingCompletionHandler,
  onboardingCompletionLoadingHandler,
} from "../../../../tests/msw/handlers";
import { NewUserOnboardingDialog } from "./new-user-onboarding-dialog";

const wallets = [
  { kind: "VOCAL_ANALYSIS" as const, balance: 5 },
  { kind: "AI_MIXING" as const, balance: 1 },
];

const meta = {
  title: "Widgets/ProductShell/NewUserOnboardingDialog",
  component: NewUserOnboardingDialog,
  parameters: { layout: "fullscreen" },
  args: { wallets },
  beforeEach({ msw }) {
    msw.use(onboardingCompletionHandler());
  },
  render: (args) => (
    <main className="min-h-screen bg-background p-6">
      <p>로그인 후 도착한 제품 화면</p>
      <NewUserOnboardingDialog {...args} />
    </main>
  ),
} satisfies Meta<typeof NewUserOnboardingDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Preview: Story = {};

export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  play: async () => {
    const body = within(document.body);
    const dialog = body.getByRole("dialog", { name: "처음 만나는 Copysinger" });
    const scoped = within(dialog);
    const funnel = scoped.getByRole("navigation", { name: "온보딩 진행 단계" });
    await waitFor(() => expect(dialog.querySelector('img[src*="copy-singer-mark.svg"]')).toBeVisible(), {
      timeout: 5_000,
    });
    await expect(within(funnel).getByText("목소리 분석").closest("li")).toHaveAttribute("aria-current", "step");
    await expect(scoped.getByText("분석 티켓").parentElement).toHaveTextContent("현재 5장");
    await expect(scoped.queryByText("믹싱 티켓")).not.toBeInTheDocument();

    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    await expect(within(funnel).getByText("노래 추천").closest("li")).toHaveAttribute("aria-current", "step");
    await expect(scoped.getByText("노래 추천에는 티켓을 사용하지 않아요.", { exact: false })).toBeVisible();

    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    await expect(within(funnel).getByText("AI 믹싱").closest("li")).toHaveAttribute("aria-current", "step");
    await expect(scoped.getByText("믹싱 티켓").parentElement).toHaveTextContent("현재 1장");
    await userEvent.click(scoped.getByRole("button", { name: "이전" }));
    await expect(within(funnel).getByText("노래 추천").closest("li")).toHaveAttribute("aria-current", "step");
    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "시작하기" }));
    await waitFor(() => expect(body.queryByRole("dialog", { name: "처음 만나는 Copysinger" })).not.toBeInTheDocument());
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  play: async () => {
    const dialog = within(document.body).getByRole("dialog", { name: "처음 만나는 Copysinger" });
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
    const scoped = within(dialog);
    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    const startButton = scoped.getByRole("button", { name: "시작하기" });
    startButton.scrollIntoView({ block: "nearest" });
    await waitFor(() => expect(startButton).toBeVisible());
  },
};

export const Saving: Story = {
  beforeEach({ msw }) {
    msw.use(onboardingCompletionLoadingHandler());
  },
  play: async () => {
    const dialog = within(document.body).getByRole("dialog", { name: "처음 만나는 Copysinger" });
    const scoped = within(dialog);
    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    await userEvent.click(scoped.getByRole("button", { name: "시작하기" }));
    await expect(scoped.getByRole("button", { name: "저장 중…" })).toBeDisabled();
    await expect(scoped.getByRole("button", { name: "이전" })).toBeDisabled();
  },
};

export const SaveFailure: Story = {
  beforeEach({ msw }) {
    msw.use(onboardingCompletionErrorHandler());
  },
  play: async () => {
    const body = within(document.body);
    const dialog = body.getByRole("dialog", { name: "처음 만나는 Copysinger" });
    const scoped = within(dialog);
    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    await userEvent.click(scoped.getByRole("button", { name: "다음" }));
    await userEvent.click(scoped.getByRole("button", { name: "시작하기" }));
    await expect(await scoped.findByRole("alert")).toHaveTextContent("완료 상태를 저장하지 못했어요");
    await expect(scoped.getByRole("button", { name: "다시 시도" })).toBeEnabled();
    await expect(body.getByRole("dialog", { name: "처음 만나는 Copysinger" })).toBeInTheDocument();
  },
};
