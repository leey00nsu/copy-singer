import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LandingPage } from "./landing-page";

const meta = {
  title: "Pages/Landing",
  component: LandingPage,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof LandingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {};

export const SignedIn: Story = {
  args: {
    authenticated: true,
  },
};
