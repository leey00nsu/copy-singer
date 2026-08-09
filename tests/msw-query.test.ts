import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { conversionJobSchema, conversionPollingInterval } from "@/features/development-conversion";
import { ticketAdjustmentResponseSchema } from "@/features/manage-tickets";
import { ApiError, requestJson, shouldRetryQuery } from "@/shared/api";
import {
  MSW_API_ORIGIN,
  malformedConversionFixture,
  queuedConversionFixture,
  succeededConversionFixture,
} from "./msw/fixtures";
import { conversionPollingSequenceHandler } from "./msw/handlers";
import { mswServer } from "./msw/server";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Number.POSITIVE_INFINITY,
        retry: shouldRetryQuery,
        retryDelay: 0,
      },
      mutations: { retry: false },
    },
  });
}

before(() => mswServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => mswServer.resetHandlers());
after(() => mswServer.close());

test("MSW parses a representative success response through the production Zod schema", async () => {
  const payload = await requestJson(`${MSW_API_ORIGIN}/api/conversions/${queuedConversionFixture.id}`, {
    schema: conversionJobSchema,
  });
  assert.deepEqual(payload, queuedConversionFixture);
});

test("ordinary 4xx responses are not retried by QueryClient", async () => {
  const client = createTestQueryClient();
  let attempts = 0;
  mswServer.use(
    http.get("*/api/conversions/forbidden", () => {
      attempts += 1;
      return HttpResponse.json({ detail: "Forbidden" }, { status: 403 });
    }),
  );

  await assert.rejects(
    client.fetchQuery({
      queryKey: ["conversion", "forbidden"],
      queryFn: () =>
        requestJson(`${MSW_API_ORIGIN}/api/conversions/forbidden`, {
          schema: conversionJobSchema,
        }),
    }),
    (error: unknown) => error instanceof ApiError && error.status === 403,
  );
  assert.equal(attempts, 1);
  client.clear();
});

test("retryable responses respect the two-retry limit and can recover", async () => {
  const client = createTestQueryClient();
  let attempts = 0;
  mswServer.use(
    http.get("*/api/conversions/retryable", () => {
      attempts += 1;
      if (attempts < 3) return HttpResponse.json({ detail: "Try again" }, { status: 503 });
      return HttpResponse.json(succeededConversionFixture);
    }),
  );

  const payload = await client.fetchQuery({
    queryKey: ["conversion", "retryable"],
    queryFn: () =>
      requestJson(`${MSW_API_ORIGIN}/api/conversions/retryable`, {
        schema: conversionJobSchema,
      }),
  });
  assert.equal(payload.status, "succeeded");
  assert.equal(attempts, 3);
  client.clear();
});

test("malformed success responses fail once as non-retryable contract errors", async () => {
  const client = createTestQueryClient();
  let attempts = 0;
  mswServer.use(
    http.get("*/api/conversions/malformed", () => {
      attempts += 1;
      return HttpResponse.json(malformedConversionFixture);
    }),
  );

  await assert.rejects(
    client.fetchQuery({
      queryKey: ["conversion", "malformed"],
      queryFn: () =>
        requestJson(`${MSW_API_ORIGIN}/api/conversions/malformed`, {
          schema: conversionJobSchema,
        }),
    }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.kind, "contract");
      assert.doesNotMatch(error.message, /privatePayload|must-not-leak/);
      return true;
    },
  );
  assert.equal(attempts, 1);
  client.clear();
});

test("the polling fixture transitions from active to terminal without leaking state", async () => {
  const client = createTestQueryClient();
  mswServer.use(conversionPollingSequenceHandler());
  const query = {
    queryKey: ["conversion", "sequence"] as const,
    queryFn: () =>
      requestJson(`${MSW_API_ORIGIN}/api/conversions/sequence`, {
        schema: conversionJobSchema,
      }),
    staleTime: 0,
  };

  const queued = await client.fetchQuery(query);
  await client.invalidateQueries({ queryKey: query.queryKey, exact: true });
  const succeeded = await client.fetchQuery(query);
  assert.equal(queued.status, "queued");
  assert.equal(conversionPollingInterval(queued), 2_500);
  assert.equal(succeeded.status, "succeeded");
  assert.equal(conversionPollingInterval(succeeded), false);
  client.clear();
});

test("a successful MSW-backed mutation updates only its owned cache key", async () => {
  const client = createTestQueryClient();
  const balanceKey = ["tickets", "balance", "user-1"] as const;
  const unrelatedKey = ["tickets", "balance", "user-2"] as const;
  client.setQueryData(unrelatedKey, 9);
  const observer = new MutationObserver(client, {
    mutationFn: () =>
      requestJson(`${MSW_API_ORIGIN}/api/admin/ticket-adjustments`, {
        method: "POST",
        json: {
          userId: "user-1",
          amount: 2,
          reason: "support credit",
          idempotencyKey: "request-1",
        },
        schema: ticketAdjustmentResponseSchema,
      }),
    onSuccess: (payload) => client.setQueryData(balanceKey, payload.balanceAfter),
  });

  const result = await observer.mutate();
  assert.equal(result.balanceAfter, 4);
  assert.equal(client.getQueryData(balanceKey), 4);
  assert.equal(client.getQueryData(unrelatedKey), 9);
  client.clear();
});
