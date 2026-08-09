import { HttpResponse, http } from "msw";
import {
  conversionHealthFixture,
  queuedConversionFixture,
  succeededConversionFixture,
  ticketAdjustmentFixture,
} from "./fixtures";

export const handlers = [
  http.get("*/api/health", () => HttpResponse.json(conversionHealthFixture)),
  http.get("*/api/conversions/:id", () => HttpResponse.json(queuedConversionFixture)),
  http.post("*/api/admin/ticket-adjustments", () => HttpResponse.json(ticketAdjustmentFixture, { status: 201 })),
];

export function conversionPollingSequenceHandler() {
  const sequence = [queuedConversionFixture, succeededConversionFixture];
  let requestIndex = 0;
  return http.get("*/api/conversions/:id", () => {
    const payload = sequence[Math.min(requestIndex, sequence.length - 1)];
    requestIndex += 1;
    return HttpResponse.json(payload);
  });
}
