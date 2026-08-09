"use client";

import { isServer, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetryQuery } from "@/shared/api";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: shouldRetryQuery,
        retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 30_000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) return createQueryClient();
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
