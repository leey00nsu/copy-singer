import { mutationOptions } from "@tanstack/react-query";
import { requestJson } from "@/shared/api";
import {
  type TicketAdjustmentRequest,
  type TicketAdjustmentResponse,
  ticketAdjustmentResponseSchema,
} from "../model/contract";

export function adjustTickets(input: TicketAdjustmentRequest): Promise<TicketAdjustmentResponse> {
  return requestJson("/api/admin/ticket-adjustments", {
    method: "POST",
    json: input,
    schema: ticketAdjustmentResponseSchema,
  });
}

export function adjustTicketsMutationOptions() {
  return mutationOptions({
    mutationKey: ["tickets", "adjust"] as const,
    mutationFn: adjustTickets,
  });
}
