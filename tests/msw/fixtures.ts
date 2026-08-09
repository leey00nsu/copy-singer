import type { ConversionHealth, ConversionJob } from "@/features/development-conversion";
import type { TicketAdjustmentResponse } from "@/features/manage-tickets";

export const MSW_API_ORIGIN = "http://copy-singer.test";

export const conversionHealthFixture: ConversionHealth = {
  status: "ok",
  platform: "modal",
  gpu: "L4",
};

export const queuedConversionFixture: ConversionJob = {
  id: "modal-job-1",
  status: "queued",
  created_at: 1,
  error: null,
  result_url: null,
};

export const succeededConversionFixture: ConversionJob = {
  ...queuedConversionFixture,
  status: "succeeded",
  result_url: "/api/conversions/modal-job-1/audio",
};

export const ticketAdjustmentFixture: TicketAdjustmentResponse = {
  id: "10000000-0000-4000-8000-000000000020",
  amount: 2,
  balanceAfter: 4,
  reason: "support credit",
  createdAt: "2026-08-09T00:00:00.000Z",
};

export const malformedConversionFixture = {
  id: queuedConversionFixture.id,
  status: "finished",
  privatePayload: "must-not-leak",
};
