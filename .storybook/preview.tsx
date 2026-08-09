import { definePreview } from "@storybook/nextjs-vite";
import { QueryClientProvider } from "@tanstack/react-query";
import addonMsw from "msw-storybook-addon";
import { type ReactNode, useEffect, useState } from "react";

import { createQueryClient } from "@/_app/providers";
import { Toaster } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";

import "../src/_app/styles/globals.css";

function StoryProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient(false));

  useEffect(() => () => queryClient.clear(), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

const preview = definePreview({
  addons: [addonMsw()],
  decorators: [
    (Story, context) => (
      <StoryProviders key={context.id}>
        <Story />
      </StoryProviders>
    ),
  ],
  parameters: {
    a11y: {
      test: "error",
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    nextjs: {
      appDirectory: true,
    },
  },
});

export default preview;
