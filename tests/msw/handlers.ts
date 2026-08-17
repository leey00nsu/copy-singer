import { delay, HttpResponse, http } from "msw";
import type { MixingHistoryPayload, MixingHistoryRow } from "@/entities/mixing-job";
import type { NotificationList } from "@/entities/notification";
import type { RecommendationRunResponse } from "@/entities/recommendation";
import {
  activeRecommendationRunFixture,
  adminCustomMixingProfilesFixture,
  mixingHistoryFixture,
  mixingJobFixture,
  notificationListFixture,
  queuedAdminCustomMixingJobFixture,
  recommendationRunFixture,
  succeededAdminCustomMixingJobFixture,
  succeededRecommendationRunFixture,
  ticketAdjustmentFixture,
  ticketBalanceFixture,
} from "./fixtures";

export const handlers = [
  http.get("*/api/admin/custom-mixing/:id", () => HttpResponse.json(queuedAdminCustomMixingJobFixture)),
  http.get("*/api/admin/custom-mixing/profiles", () => HttpResponse.json(adminCustomMixingProfilesFixture)),
  http.post("*/api/admin/custom-mixing", () => HttpResponse.json(queuedAdminCustomMixingJobFixture, { status: 202 })),
  http.get("*/api/recommendations/:id", () => HttpResponse.json(recommendationRunFixture)),
  http.post("*/api/mixing-jobs", () => HttpResponse.json(mixingJobFixture, { status: 201 })),
  http.post("*/api/admin/ticket-adjustments", () => HttpResponse.json(ticketAdjustmentFixture, { status: 201 })),
  http.get("*/api/account/ticket-balance", () => HttpResponse.json(ticketBalanceFixture)),
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
  return http.get("*/api/notifications", ({ request }) => {
    const unreadOnly = new URL(request.url).searchParams.get("unreadOnly") === "true";
    if (!unreadOnly) return HttpResponse.json(payload);
    const notifications = payload.notifications.filter((notification) => notification.readAt === null);
    return HttpResponse.json({
      ...payload,
      page: 1,
      total: notifications.length,
      pageCount: 1,
      unreadCount: notifications.length,
      notifications,
    });
  });
}

export function notificationUnreadLifecycleHandlers(payload: NotificationList = notificationListFixture) {
  let allRead = false;
  return [
    http.get("*/api/notifications", ({ request }) => {
      const unreadOnly = new URL(request.url).searchParams.get("unreadOnly") === "true";
      const notifications = allRead
        ? []
        : payload.notifications.filter((notification) => !unreadOnly || notification.readAt === null);
      return HttpResponse.json({
        ...payload,
        page: 1,
        total: notifications.length,
        pageCount: 1,
        unreadCount: allRead ? 0 : payload.unreadCount,
        notifications,
      });
    }),
    http.post("*/api/notifications/read-all", () => {
      allRead = true;
      return HttpResponse.json({ updatedCount: payload.unreadCount, unreadCount: 0 });
    }),
  ];
}

export function ticketBalanceHandler(payload = ticketBalanceFixture) {
  return http.get("*/api/account/ticket-balance", () => HttpResponse.json(payload));
}

export function onboardingCompletionHandler(completedAt = "2026-08-17T04:00:00.000Z") {
  return http.post("*/api/account/onboarding/completion", () => HttpResponse.json({ completedAt }));
}

export function onboardingCompletionErrorHandler() {
  return http.post("*/api/account/onboarding/completion", () =>
    HttpResponse.json(
      {
        error: {
          code: "ONBOARDING_COMPLETION_FAILED",
          message: "완료 상태를 저장하지 못했어요.",
          retryable: true,
        },
      },
      { status: 500 },
    ),
  );
}

export function onboardingCompletionLoadingHandler() {
  return http.post("*/api/account/onboarding/completion", async () => {
    await delay("infinite");
    return HttpResponse.json({ completedAt: "2026-08-17T04:00:00.000Z" });
  });
}

export function adminCustomMixingPollingSequenceHandler() {
  const sequence = [queuedAdminCustomMixingJobFixture, succeededAdminCustomMixingJobFixture];
  let requestIndex = 0;
  return http.get("*/api/admin/custom-mixing/:id", () => {
    const payload = sequence[Math.min(requestIndex, sequence.length - 1)];
    requestIndex += 1;
    return HttpResponse.json(payload);
  });
}

export function adminCustomMixingProfilesHandler(payload = adminCustomMixingProfilesFixture) {
  return http.get("*/api/admin/custom-mixing/profiles", () => HttpResponse.json(payload));
}

export function adminCustomMixingSubmitHandler(payload = queuedAdminCustomMixingJobFixture) {
  return http.post("*/api/admin/custom-mixing", () => HttpResponse.json(payload, { status: 202 }));
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
