import { delay, HttpResponse, http } from "msw";
import type { MixingHistoryPayload, MixingHistoryRow } from "@/entities/mixing-job";
import type { NotificationList } from "@/entities/notification";
import type { RecommendationRunResponse } from "@/entities/recommendation";
import {
  activeRecommendationRunFixture,
  conversionHealthFixture,
  mixingHistoryFixture,
  mixingJobFixture,
  notificationListFixture,
  queuedConversionFixture,
  recommendationRunFixture,
  succeededConversionFixture,
  succeededRecommendationRunFixture,
  ticketAdjustmentFixture,
} from "./fixtures";

export const handlers = [
  http.get("*/api/health", () => HttpResponse.json(conversionHealthFixture)),
  http.get("*/api/conversions/:id", () => HttpResponse.json(queuedConversionFixture)),
  http.get("*/api/recommendations/:id", () => HttpResponse.json(recommendationRunFixture)),
  http.post("*/api/mixing-jobs", () => HttpResponse.json(mixingJobFixture, { status: 201 })),
  http.post("*/api/admin/ticket-adjustments", () => HttpResponse.json(ticketAdjustmentFixture, { status: 201 })),
  http.get("*/api/notifications", () => HttpResponse.json(notificationListFixture)),
  http.patch("*/api/notifications/:id", ({ params }) => {
    const notification = notificationListFixture.notifications.find((item) => item.id === params.id) ?? null;
    return HttpResponse.json({
      notification: notification ? { ...notification, readAt: "2026-08-11T13:00:00.000Z" } : null,
    });
  }),
  http.post("*/api/notifications/read-all", () => HttpResponse.json({ updatedCount: 2, unreadCount: 0 })),
];

export function notificationListHandler(payload: NotificationList = notificationListFixture) {
  return http.get("*/api/notifications", () => HttpResponse.json(payload));
}

export function conversionPollingSequenceHandler() {
  const sequence = [queuedConversionFixture, succeededConversionFixture];
  let requestIndex = 0;
  return http.get("*/api/conversions/:id", () => {
    const payload = sequence[Math.min(requestIndex, sequence.length - 1)];
    requestIndex += 1;
    return HttpResponse.json(payload);
  });
}

export function recommendationHandler(payload: RecommendationRunResponse = recommendationRunFixture) {
  return http.get("*/api/recommendations/:id", () => HttpResponse.json(payload));
}

export function recommendationLoadingHandler() {
  return http.get("*/api/recommendations/:id", async () => {
    await delay("infinite");
    return HttpResponse.json(recommendationRunFixture);
  });
}

export function recommendationForbiddenHandler() {
  return http.get("*/api/recommendations/:id", () =>
    HttpResponse.json(
      {
        error: {
          code: "RECOMMENDATION_NOT_FOUND",
          message: "이 추천 결과에 접근할 권한이 없습니다.",
          retryable: false,
        },
      },
      { status: 403 },
    ),
  );
}

export function recommendationPollingSequenceHandler(
  sequence: RecommendationRunResponse[] = [activeRecommendationRunFixture, succeededRecommendationRunFixture],
) {
  let requestIndex = 0;
  return http.get("*/api/recommendations/:id", () => {
    const payload = sequence[Math.min(requestIndex, sequence.length - 1)] ?? succeededRecommendationRunFixture;
    requestIndex += 1;
    return HttpResponse.json(payload);
  });
}

export function mixingSubmissionHandler() {
  return http.post("*/api/mixing-jobs", () => HttpResponse.json(mixingJobFixture, { status: 201 }));
}

export function mixingHistoryHandler(payload: MixingHistoryPayload = mixingHistoryFixture) {
  return http.get("*/api/mixing-jobs", () => HttpResponse.json(payload));
}

const defaultMixingDetail = mixingHistoryFixture.jobs[0];
if (!defaultMixingDetail) throw new Error("The MSW mixing fixture requires at least one detail row.");

export function mixingDetailHandler(payload: MixingHistoryRow = defaultMixingDetail) {
  return http.get("*/api/mixing-jobs/:id", () => HttpResponse.json(payload));
}

export function mixingDeleteHandler(mediaCleanupPending = false) {
  return http.delete("*/api/mixing-jobs/:id", ({ params }) =>
    HttpResponse.json({ status: "deleted", id: params.id, mediaCleanupPending }),
  );
}

export function mixingForbiddenHandler() {
  return http.post("*/api/mixing-jobs", () =>
    HttpResponse.json(
      {
        error: {
          code: "TICKET_BALANCE_INSUFFICIENT",
          message: "티켓이 부족합니다.",
          retryable: false,
        },
      },
      { status: 403 },
    ),
  );
}
