import { z } from "zod";

export const ticketKindSchema = z.enum(["VOCAL_ANALYSIS", "AI_MIXING"]);
export type TicketKind = z.infer<typeof ticketKindSchema>;

export const ticketWalletSchema = z.object({
  kind: ticketKindSchema,
  balance: z.number().int().nonnegative(),
});

export type TicketWallet = z.infer<typeof ticketWalletSchema>;

export const ticketWalletsSchema = z.object({
  wallets: z.array(ticketWalletSchema),
});

export type TicketWallets = z.infer<typeof ticketWalletsSchema>;

export function ticketBalanceForKind(wallets: TicketWallet[] | undefined, kind: TicketKind) {
  return wallets?.find((wallet) => wallet.kind === kind)?.balance ?? 0;
}

export function ticketKindLabel(kind: TicketKind) {
  return kind === "VOCAL_ANALYSIS" ? "분석 티켓" : "믹싱 티켓";
}
