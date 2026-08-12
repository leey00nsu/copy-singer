import { z } from "zod";

export const ticketBalanceSchema = z.object({
  balance: z.number().int().nonnegative(),
});

export type TicketBalance = z.infer<typeof ticketBalanceSchema>;
