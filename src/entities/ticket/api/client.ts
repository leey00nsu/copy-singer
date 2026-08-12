import { queryOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import { ticketBalanceSchema } from "../model/contract";

export const ticketKeys = {
  all: ["tickets"] as const,
  balance: () => [...ticketKeys.all, "balance"] as const,
} as const;

export function getCurrentTicketBalance(signal?: AbortSignal) {
  return requestJson("/api/account/ticket-balance", {
    cache: "no-store",
    signal,
    schema: ticketBalanceSchema,
  });
}

export function ticketBalanceQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: ticketKeys.balance(),
    queryFn: ({ signal }) => getCurrentTicketBalance(signal),
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
