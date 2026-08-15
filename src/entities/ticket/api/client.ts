import { queryOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { ticketWalletsSchema } from "../model/contract";

export const ticketKeys = {
  all: ["tickets"] as const,
  wallets: () => [...ticketKeys.all, "wallets"] as const,
} as const;

export function getCurrentTicketWallets(signal?: AbortSignal) {
  return requestJson("/api/account/ticket-balance", {
    cache: "no-store",
    signal,
    schema: ticketWalletsSchema,
  });
}

export function ticketWalletsQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: ticketKeys.wallets(),
    queryFn: ({ signal }) => getCurrentTicketWallets(signal),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
