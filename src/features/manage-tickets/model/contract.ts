import { z } from "zod";
import { ticketKindSchema } from "@/entities/ticket/index.model";

export const ticketAdjustmentRequestSchema = z.object({
  userId: z.string().min(1),
  kind: ticketKindSchema,
  amount: z
    .number()
    .int()
    .safe()
    .refine((amount) => amount !== 0 && Math.abs(amount) <= 10_000),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(1).max(200),
});

export type TicketAdjustmentRequest = z.infer<typeof ticketAdjustmentRequestSchema>;

export const ticketAdjustmentResponseSchema = z.object({
  id: z.uuid(),
  kind: ticketKindSchema,
  amount: z.number().int(),
  balanceAfter: z.number().int().nonnegative(),
  reason: z.string(),
  createdAt: z.string(),
});

export type TicketAdjustmentResponse = z.infer<typeof ticketAdjustmentResponseSchema>;
