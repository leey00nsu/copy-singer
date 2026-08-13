import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import type { MixingHistoryPayload } from "@/entities/mixing-job";
import type { VocalProfileHistoryPayload } from "@/entities/vocal-profile";
import { ProductPageIntro } from "@/shared/ui/product-page-intro";
import { LibraryTabs, MixingLibrary, VocalProfileLibrary } from "@/widgets/library";
import { ProductShell } from "@/widgets/product-shell";

const denseMixingHistory: MixingHistoryPayload = {
  page: 1,
  pageSize: 20,
  total: 12,
  pageCount: 1,
  jobs: Array.from({ length: 12 }, (_, index): MixingHistoryPayload["jobs"][number] => {
    const succeeded = index % 2 === 0;
    const suffix = String(index + 201).padStart(12, "0");
    return {
      id: `30000000-0000-4000-8000-${suffix}`,
      status: succeeded ? "succeeded" : "failed",
      ticketCost: 1,
      error: succeeded ? null : { code: "MIXING_TARGET_UNAVAILABLE", detail: "upstream fetch failed (502)" },
      song: {
        title: succeeded ? `서른 즈음에 ${index + 1}` : `기억의 습작 ${index + 1}`,
        artist: succeeded ? "김광석" : "전람회",
        catalogOrder: 300 + index,
      },
      vocalProfile: {
        id: `30000000-0000-4000-9000-${suffix}`,
        displayName: `보컬 프로필 ${(index % 3) + 1}`,
        createdAt: "2026-08-01T00:00:00.000Z",
      },
      resultReady: succeeded,
      audioUrl: succeeded ? "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=" : null,
      createdAt: `2026-08-${String(9 - (index % 7)).padStart(2, "0")}T03:00:00.000Z`,
      updatedAt: "2026-08-09T03:02:00.000Z",
      submittedAt: "2026-08-09T03:00:20.000Z",
      startedAt: "2026-08-09T03:00:30.000Z",
      completedAt: "2026-08-09T03:02:00.000Z",
    };
  }),
};

const denseProfileHistory: VocalProfileHistoryPayload = {
  page: 1,
  pageSize: 12,
  total: 10,
  pageCount: 1,
  profiles: Array.from({ length: 10 }, (_, index): VocalProfileHistoryPayload["profiles"][number] => {
    const suffix = String(index + 301).padStart(12, "0");
    return {
      id: `40000000-0000-4000-8000-${suffix}`,
      profileNumber: index + 1,
      displayName: `보컬 프로필 ${index + 1}`,
      minMidi: 46,
      maxMidi: 70,
      medianMidi: 58,
      tessituraLowMidi: 50,
      tessituraHighMidi: 66,
      voicedRatio: 0.86,
      pitchStability: 0.91,
      clippingRatio: 0,
      rmsDb: -20,
      analyzer: "storybook",
      analyzerVersion: "1",
      durationMs: 10_400,
      mimeType: "audio/wav",
      mixingCount: index % 4,
      createdAt: `2026-08-${String(9 - (index % 7)).padStart(2, "0")}T00:00:00.000Z`,
    };
  }),
};

function LibraryPreview({ tab }: { tab: "profiles" | "mixes" }) {
  return (
    <ProductShell user={{ email: "jieun@copysinger.test", name: "지은" }}>
      <div className="mx-auto w-full max-w-[72rem] px-5 py-12 sm:px-7 lg:px-8 lg:py-14">
        <ProductPageIntro
          description="저장한 보컬 프로필과 AI 믹싱 작업을 구분해 확인하세요."
          eyebrow="Library"
          title="내 라이브러리"
        />
        <div className="mt-7">
          <LibraryTabs tab={tab} />
        </div>
        <div className="mt-4">
          {tab === "profiles" ? (
            <VocalProfileLibrary history={denseProfileHistory} />
          ) : (
            <MixingLibrary filters={{ page: 1, q: "", status: "all" }} initial={denseMixingHistory} />
          )}
        </div>
      </div>
    </ProductShell>
  );
}

const meta = {
  title: "Pages/Library/Dense Product Shell",
  component: LibraryPreview,
  args: { tab: "profiles" },
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: "/library" } },
  },
} satisfies Meta<typeof LibraryPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Profiles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const productMenu = within(canvas.getByRole("navigation", { name: "제품 메뉴" }));
    await expect(productMenu.getByRole("link", { name: "라이브러리" })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByText("보컬 프로필 10개")).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: /분석과 제출 보컬 보기/ })).toHaveLength(10);
  },
};

export const Mixes: Story = {
  args: { tab: "mixes" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("저장된 AI 믹스 12개")).toBeVisible();
    await expect(canvas.getAllByRole("link", { name: /AI 믹스 상세 보기/ })).toHaveLength(12);
    await expect(canvas.queryByRole("link", { name: "결과 듣기" })).not.toBeInTheDocument();
    await expect(canvas.queryByText(/upstream|502/)).not.toBeInTheDocument();
  },
};
