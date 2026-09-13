import assert from "node:assert/strict";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("queue counts and inserts serialize across concurrent producers", async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  const { lockQueueAdmission, checkQueueCapacity, AdmissionError } = await import(
    "../src/shared/lib/admission/index.server"
  );
  const previous = process.env.VOCAL_QUEUE_CAPACITY;
  process.env.VOCAL_QUEUE_CAPACITY = "2";
  const users = Array.from({ length: 8 }, () => crypto.randomUUID());
  try {
    for (const id of users) await prisma.user.create({ data: { id, name: "Capacity", email: `${id}@example.test` } });
    const outcomes = await Promise.allSettled(
      users.map((userId) =>
        prisma.$transaction(async (tx) => {
          await lockQueueAdmission(tx, "VOCAL");
          await checkQueueCapacity(tx, "VOCAL", userId);
          return tx.vocalProfileAnalysisJob.create({
            data: { userId, recordingId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID() },
          });
        }),
      ),
    );
    assert.equal(outcomes.filter((outcome) => outcome.status === "fulfilled").length, 2);
    assert.equal(await prisma.vocalProfileAnalysisJob.count({ where: { userId: { in: users } } }), 2);
    for (const outcome of outcomes)
      if (outcome.status === "rejected") assert.ok(outcome.reason instanceof AdmissionError);
    assert.equal(await prisma.ticketLedger.count({ where: { userId: { in: users } } }), 0);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    if (previous === undefined) delete process.env.VOCAL_QUEUE_CAPACITY;
    else process.env.VOCAL_QUEUE_CAPACITY = previous;
    await prisma.$disconnect();
  }
});

test("invalid key is rejected before upload body and timeout releases the upload slot", async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  const { uploadSlots } = await import("../src/shared/lib/admission/index.server");
  const previous = { ...process.env };
  const userId = crypto.randomUUID();
  Object.assign(process.env, {
    NODE_ENV: "test",
    DEV_AUTH_BYPASS_ENABLED: "true",
    DEV_AUTH_BYPASS_USER_ID: userId,
    MEDIA_UPLOAD_TIMEOUT_MS: "20",
  });
  try {
    await prisma.user.create({ data: { id: userId, name: "Body", email: `${userId}@example.test` } });
    await prisma.ticketWallet.create({ data: { userId, kind: "VOCAL_ANALYSIS", balance: 100 } });
    const { POST } = await import("../src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route");
    let reads = 0;
    let canceled = false;
    const request = (key?: string) =>
      new Request("http://localhost/api/vocal-profiles/analysis-jobs", {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data; boundary=test", ...(key ? { "Idempotency-Key": key } : {}) },
        body: new ReadableStream(
          {
            pull() {
              reads++;
            },
            cancel() {
              canceled = true;
            },
          },
          { highWaterMark: 0 },
        ),
        duplex: "half",
      } as RequestInit);
    assert.equal((await POST(request())).status, 400);
    assert.equal(reads, 0);
    uploadSlots.acquire(userId)();
    assert.equal((await POST(request("valid-key"))).status, 400);
    assert.equal(canceled, true);
    uploadSlots.acquire(userId)();
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
    for (const key of ["NODE_ENV", "DEV_AUTH_BYPASS_ENABLED", "DEV_AUTH_BYPASS_USER_ID", "MEDIA_UPLOAD_TIMEOUT_MS"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    await prisma.$disconnect();
  }
});
