import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import AccountLoading from "@/_pages/account/ui/account-loading";
import AdminLoading from "@/_pages/admin/ui/admin-loading";
import AdminCustomMixingLoading from "@/_pages/admin-custom-mixing/ui/admin-custom-mixing-loading";
import AdminSongCatalogLoading from "@/_pages/admin-song-catalog/ui/admin-song-catalog-loading";
import LibraryLoading from "@/_pages/library/ui/library-loading";
import MixingDetailLoading from "@/_pages/mixing-detail/ui/mixing-detail-loading";
import NotificationsLoading from "@/_pages/notifications/ui/notifications-loading";
import ProfileLoading from "@/_pages/profile/ui/profile-loading";
import RecommendationLoading from "@/_pages/recommendation-detail/ui/recommendation-loading";
import SongDetailLoading from "@/_pages/song-detail/ui/song-detail-loading";
import VocalProfileDetailLoading from "@/_pages/vocal-profile-detail/ui/vocal-profile-detail-loading";
import { PageSkeleton } from "@/shared/ui/page-skeleton";

const meta = {
  title: "Shared UI/Skeletons",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function expectSkeletonsVisible(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const skeletons = canvasElement.querySelectorAll<HTMLElement>('[data-slot="skeleton"]');
  await expect(skeletons.length).toBeGreaterThan(0);
  // Reduced-motion guard: at least one skeleton should have motion-reduce:animate-none class
  const hasReducedMotionGuard = Array.from(skeletons).some((el) => el.className.includes("motion-reduce:animate-none") || el.className.includes("animate-pulse"));
  await expect(hasReducedMotionGuard).toBe(true);
}

async function expectStatusRole(canvasElement: HTMLElement) {
  const status = canvasElement.querySelector('[role="status"]');
  await expect(status).not.toBeNull();
  await expect(status?.getAttribute("aria-busy")).toBe("true");
}

export const PageSkeletonDefault: Story = {
  render: () => <PageSkeleton />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const Profile: Story = {
  render: () => <ProfileLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const Account: Story = {
  render: () => <AccountLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const Notifications: Story = {
  render: () => <NotificationsLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const VocalProfileDetail: Story = {
  render: () => <VocalProfileDetailLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const Library: Story = {
  render: () => <LibraryLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const MixingDetail: Story = {
  render: () => <MixingDetailLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const Recommendation: Story = {
  render: () => <RecommendationLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const SongDetail: Story = {
  render: () => <SongDetailLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const Admin: Story = {
  render: () => <AdminLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const AdminSongs: Story = {
  render: () => <AdminSongCatalogLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

export const AdminCustomMixing: Story = {
  render: () => <AdminCustomMixingLoading />,
  play: async ({ canvasElement }) => {
    await expectSkeletonsVisible(canvasElement);
    await expectStatusRole(canvasElement);
  },
};

