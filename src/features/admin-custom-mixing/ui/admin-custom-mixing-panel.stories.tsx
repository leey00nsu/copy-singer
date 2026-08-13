import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { succeededAdminCustomMixingJobFixture } from "../../../../tests/msw/fixtures";
import { adminCustomMixingProfilesHandler, adminCustomMixingSubmitHandler } from "../../../../tests/msw/handlers";
import { AdminCustomMixingPanel } from "./admin-custom-mixing-panel";

const meta = {
  title: "Features/Admin Custom Mixing/Panel",
  component: AdminCustomMixingPanel,
  parameters: { layout: "padded" },
  beforeEach({ msw }) {
    msw.use(adminCustomMixingProfilesHandler());
  },
} satisfies Meta<typeof AdminCustomMixingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("커스텀 믹싱 실행")).toBeVisible();
    await expect(canvas.getByText("아직 커스텀 믹싱 결과가 없어요")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "커스텀 믹싱 시작" })).toBeDisabled();
  },
};

async function pickProfileAndUpload(canvas: ReturnType<typeof within>) {
  await waitFor(() => {
    expect(canvas.getByRole("combobox", { name: "보컬 프로필" })).toBeEnabled();
  });
  await userEvent.click(canvas.getByRole("combobox", { name: "보컬 프로필" }));
  await userEvent.click(await within(document.body).findByRole("option", { name: /메인 보컬/ }));
  await userEvent.upload(
    canvas.getByLabelText("target 음원"),
    new File([new Uint8Array(16)], "custom.wav", { type: "audio/wav" }),
  );
}

export const Queued: Story = {
  beforeEach({ msw }) {
    msw.use(adminCustomMixingSubmitHandler());
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pickProfileAndUpload(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "커스텀 믹싱 시작" }));
    await expect(canvas.getByText("GPU 처리 순서를 기다리고 있어요")).toBeVisible();
    await expect(canvas.getByText("GPU 대기 중")).toBeVisible();
  },
};

export const Succeeded: Story = {
  beforeEach({ msw }) {
    msw.use(adminCustomMixingSubmitHandler(succeededAdminCustomMixingJobFixture));
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pickProfileAndUpload(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "커스텀 믹싱 시작" }));
    await expect(canvas.getByText("믹싱 결과가 준비됐습니다")).toBeVisible();
    await expect(canvas.getByRole("link", { name: /결과 WAV 다운로드/ })).toBeVisible();
  },
};
