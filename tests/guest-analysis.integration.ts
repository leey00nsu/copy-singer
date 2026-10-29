import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

test("guest identity owns no member session or signup tickets, and token hashes are not bearer tokens", async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  const { createGuestTrial, getGuestTrial, hashGuestToken } = await import(
    "../src/entities/guest-analysis/index.server"
  );
  const { getAnalysisActor, requireApiSession } = await import("../src/features/authentication/index.server");
  const { GET: memberTickets } = await import("../src/_app/api-routes/account/tickets-route");
  const { trial, token } = await createGuestTrial();
  const previous = process.env.DEV_AUTH_BYPASS_ENABLED;
  process.env.DEV_AUTH_BYPASS_ENABLED = "false";
  try {
    const headers = new Headers({ Cookie: `copy-singer.guest-trial=${token}` });
    assert.equal((await getGuestTrial(headers))?.id, trial.id);
    assert.equal(trial.tokenHash, hashGuestToken(token));
    assert.notEqual(trial.tokenHash, token);
    assert.equal(await getGuestTrial(new Headers({ Cookie: `copy-singer.guest-trial=${trial.tokenHash}` })), null);
    const request = new Request("http://localhost/api/account/tickets", { headers });
    assert.deepEqual(await getAnalysisActor(request), { userId: trial.userId, guest: true });
    assert.equal(await requireApiSession(request), null);
    assert.equal((await memberTickets(request)).status, 401);
    assert.equal(await prisma.ticketWallet.count({ where: { userId: trial.userId } }), 0);
    assert.equal(await prisma.ticketLedger.count({ where: { userId: trial.userId } }), 0);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: trial.userId } })).isGuest, true);
  } finally {
    await prisma.user.delete({ where: { id: trial.userId } });
    if (previous === undefined) delete process.env.DEV_AUTH_BYPASS_ENABLED;
    else process.env.DEV_AUTH_BYPASS_ENABLED = previous;
  }
});

test("trial creation requires same origin and reuses the existing browser identity", async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  const { POST } = await import("../src/_app/api-routes/guest-analysis/guest-analysis-route");
  const { getGuestTrial } = await import("../src/entities/guest-analysis/index.server");
  const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost").origin;
  const response = await POST(
    new Request(`${origin}/api/guest-analysis`, { method: "POST", headers: { Origin: "https://attacker.example" } }),
  );
  assert.equal(response.status, 403);
  const created = await POST(
    new Request(`${origin}/api/guest-analysis`, { method: "POST", headers: { Origin: origin } }),
  );
  assert.equal(created.status, 200);
  const cookie = created.headers.get("Set-Cookie")!;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  const headers = new Headers({ Cookie: cookie.split(";", 1)[0]!, Origin: origin });
  const trial = (await getGuestTrial(headers))!;
  try {
    const repeated = await POST(new Request(`${origin}/api/guest-analysis`, { method: "POST", headers }));
    assert.equal(repeated.status, 200);
    assert.equal(repeated.headers.get("Set-Cookie"), null);
    assert.equal((await getGuestTrial(headers))?.userId, trial.userId);
  } finally {
    await prisma.user.delete({ where: { id: trial.userId } });
  }
});

test.after(async () => {
  const { prisma } = await import("../src/shared/db/index.server");
  await prisma.$disconnect();
});

function encodedArtifact(bytes: Uint8Array, fileName = "source.wav") {
  return {
    fileName,
    mimeType: "audio/wav",
    sizeBytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    contentBase64: Buffer.from(bytes).toString("base64"),
  };
}

function modalEnvelope(recordingId: string, source: Uint8Array) {
  return {
    transportVersion: "modal-analysis-envelope-v1",
    profile: {
      recordingId,
      mimeType: "audio/wav",
      sizeBytes: source.byteLength,
      durationMs: 5_000,
      sampleRate: 16_000,
      minMidi: 55,
      maxMidi: 72,
      p10Midi: 58,
      medianMidi: 64,
      p90Midi: 70,
      tessituraLowMidi: 58,
      tessituraHighMidi: 70,
      voicedRatio: 0.9,
      pitchStability: 0.8,
      clippingRatio: 0,
      rmsDb: -18,
      analyzer: "librosa-pyin",
      analyzerVersion: "0.11.0",
      descriptors: {
        synthesisReference: {
          algorithm: "voiced-phrase-band-selection",
          version: "smart-reference-v1",
          status: "unavailable",
          fallbackReason: "no-quality-phrase",
        },
      },
      synthesisReference: null,
    },
    artifacts: { source: encodedArtifact(source), synthesisReference: null },
    cleanupConfirmed: true,
  };
}

async function guestFixture() {
  const { prisma } = await import("../src/shared/db/index.server");
  const { createGuestTrial } = await import("../src/entities/guest-analysis/index.server");
  const { trial, token } = await createGuestTrial();
  const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost").origin;
  const headers = new Headers({ Cookie: `copy-singer.guest-trial=${token}`, Origin: origin });
  const file = new File([new Uint8Array([1, 2, 3, 4, 5, 6])], "voice.wav", { type: "audio/wav" });
  return { prisma, trial, headers, file };
}

async function cleanupFixture(userIds: string[]) {
  const { prisma } = await import("../src/shared/db/index.server");
  const profiles = await prisma.vocalProfile.findMany({
    where: { userId: { in: userIds } },
    select: { recordingId: true },
  });
  await prisma.guestAnalysisTrial.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.vocalProfileAnalysisJob.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.vocalProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.recording.deleteMany({ where: { id: { in: profiles.map((profile) => profile.recordingId) } } });
  await prisma.mediaAsset.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.mediaOperation.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function withFakeMedia(run: () => Promise<void>) {
  const previousFetch = globalThis.fetch;
  const previous = { ...process.env };
  Object.assign(process.env, {
    LEEMAGE_BASE_URL: "https://guest-media.example/api/v1",
    LEEMAGE_API_KEY: "fixture",
    LEEMAGE_PROJECT_ID: "fixture",
    VOCAL_PROFILE_MODAL_URL: "https://guest-analyzer.example",
    VOCAL_PROFILE_MODAL_API_KEY: "fixture",
    GUEST_ANALYSIS_DAILY_LIMIT: "100",
    DEV_AUTH_BYPASS_ENABLED: "false",
  });
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.endsWith("/files/presign")) {
      const fileId = crypto.randomUUID();
      return Response.json({
        presignedUrl: `https://guest-media.example/upload/${fileId}`,
        objectName: `fixture/${fileId}`,
        fileId,
      });
    }
    if (init?.method === "PUT") return new Response(null, { status: 200 });
    if (url.endsWith("/files/confirm")) {
      const { fileId } = JSON.parse(String(init?.body));
      return Response.json(
        { file: { id: fileId, url: `https://guest-media.example/audio/${fileId}` } },
        { status: 201 },
      );
    }
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    if (url.includes("/audio/"))
      return new Response(new Uint8Array([1, 2, 3, 4, 5, 6]), { headers: { "Content-Type": "audio/wav" } });
    throw new Error(`Unexpected fixture request: ${url}`);
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of [
      "LEEMAGE_BASE_URL",
      "LEEMAGE_API_KEY",
      "LEEMAGE_PROJECT_ID",
      "VOCAL_PROFILE_MODAL_URL",
      "VOCAL_PROFILE_MODAL_API_KEY",
      "GUEST_ANALYSIS_DAILY_LIMIT",
      "DEV_AUTH_BYPASS_ENABLED",
      "DEV_AUTH_BYPASS_USER_ID",
      "NODE_ENV",
    ]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

async function completeGuestJob(job: { id: string; recordingId: string }, success = true) {
  const { claimNextVocalProfileAnalysisJob, processClaimedVocalProfileAnalysisJob } = await import(
    "../src/_app/background-jobs/vocal-profile-analysis/index.server"
  );
  const mediaFetch = globalThis.fetch;
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6]);
  const fetchImpl = (async (input, init) => {
    if (String(input) === "https://guest-analyzer.example/v1/analyze")
      return success
        ? Response.json(modalEnvelope(job.recordingId, bytes))
        : Response.json(
            { error: { code: "TOO_SILENT", detail: "Audio is too quiet.", retryable: false } },
            { status: 422 },
          );
    return mediaFetch(input, init);
  }) as typeof fetch;
  const owner = `guest-worker-${crypto.randomUUID()}`;
  assert.equal(await claimNextVocalProfileAnalysisJob(owner, job.id), job.id);
  await processClaimedVocalProfileAnalysisJob(job.id, owner, { fetchImpl });
}

test("guest queue admits one job, recovers failures and permanently consumes success without tickets", async () =>
  withFakeMedia(async () => {
    const { prisma, trial, headers, file } = await guestFixture();
    const { enqueueVocalProfileAnalysis, preflightVocalProfileAnalysis } = await import(
      "../src/features/analyze-vocal-profile/index.server"
    );
    const { canReadGuestResource } = await import("../src/entities/guest-analysis/index.server");
    try {
      const jobs = await Promise.allSettled(
        ["first", "raced"].map((idempotencyKey) =>
          enqueueVocalProfileAnalysis({ userId: trial.userId, idempotencyKey, file }),
        ),
      );
      const accepted = jobs.find((result) => result.status === "fulfilled");
      assert.ok(accepted?.status === "fulfilled");
      assert.equal(jobs.filter((result) => result.status === "fulfilled").length, 1);
      const first = accepted.value;
      assert.equal(
        (await enqueueVocalProfileAnalysis({ userId: trial.userId, idempotencyKey: first.idempotencyKey, file })).id,
        first.id,
      );
      await completeGuestJob(first, false);
      assert.equal(
        (await prisma.vocalProfileAnalysisJob.findUniqueOrThrow({ where: { id: first.id } })).status,
        "FAILED",
      );
      assert.equal((await prisma.guestAnalysisTrial.findUniqueOrThrow({ where: { id: trial.id } })).consumedAt, null);
      const second = await enqueueVocalProfileAnalysis({ userId: trial.userId, idempotencyKey: "after-failure", file });
      await completeGuestJob(second);
      const used = await prisma.guestAnalysisTrial.findUniqueOrThrow({
        where: { id: trial.id },
        include: { job: true },
      });
      assert.ok(used.consumedAt);
      assert.equal(used.expiresAt!.getTime() - used.consumedAt.getTime(), 86_400_000);
      assert.equal(used.job?.status, "SUCCEEDED");
      assert.equal(used.job?.ticketCost, 0);
      assert.equal(await prisma.ticketLedger.count({ where: { userId: trial.userId } }), 0);
      assert.equal(await prisma.notification.count({ where: { userId: trial.userId } }), 0);
      await assert.rejects(() => preflightVocalProfileAnalysis(trial.userId, "third"), /GUEST_ANALYSIS_USED/);
      const { GET } = await import("../src/_app/api-routes/vocal-profiles/vocal-profile-analysis-job-detail-route");
      const response = await GET(
        new Request(`http://localhost/api/vocal-profile-analysis-jobs/${second.id}`, { headers }),
        { params: Promise.resolve({ id: second.id }) },
      );
      assert.equal(response.status, 200);
      assert.ok((await response.json()).profile);
      assert.equal(await canReadGuestResource("someone-else", { jobId: second.id }), false);
    } finally {
      await cleanupFixture([trial.userId]);
    }
  }));

test("existing member saves exactly one new numbered profile, all assets and no ticket changes", async () =>
  withFakeMedia(async () => {
    const { prisma, trial, headers, file } = await guestFixture();
    const { enqueueVocalProfileAnalysis } = await import("../src/features/analyze-vocal-profile/index.server");
    const { claimGuestAnalysis, cleanupExpiredGuestAnalysis } = await import(
      "../src/entities/guest-analysis/index.server"
    );
    const memberId = `member-${crypto.randomUUID()}`;
    const otherId = `other-${crypto.randomUUID()}`;
    try {
      await prisma.user.createMany({
        data: [memberId, otherId].map((id) => ({
          id,
          name: "Member",
          email: `${id}@example.test`,
          nextVocalProfileNumber: 3,
        })),
      });
      await prisma.ticketWallet.create({ data: { userId: memberId, kind: "VOCAL_ANALYSIS", balance: 4 } });
      const job = await enqueueVocalProfileAnalysis({ userId: trial.userId, idempotencyKey: "save-me", file });
      await assert.rejects(() => claimGuestAnalysis(headers, memberId), /GUEST_ANALYSIS_PROCESSING/);
      await completeGuestJob(job);
      await assert.rejects(() => claimGuestAnalysis(headers, "missing-member"));
      assert.equal(
        (await prisma.vocalProfileAnalysisJob.findUniqueOrThrow({ where: { id: job.id } })).userId,
        trial.userId,
      );
      Object.assign(process.env, {
        NODE_ENV: "test",
        DEV_AUTH_BYPASS_ENABLED: "true",
        DEV_AUTH_BYPASS_USER_ID: memberId,
      });
      const { GET: audio } = await import("../src/_app/api-routes/vocal-profiles/vocal-profile-audio-route");
      const unsaved = await prisma.vocalProfileAnalysisJob.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(
        (
          await audio(new Request("http://localhost/audio", { headers }), {
            params: Promise.resolve({ id: unsaved.vocalProfileId! }),
          })
        ).status,
        200,
      );
      const before = await prisma.ticketWallet.findMany({ where: { userId: memberId } });
      const claims = await Promise.all([claimGuestAnalysis(headers, memberId), claimGuestAnalysis(headers, memberId)]);
      assert.equal(claims[0]!.profileId, claims[1]!.profileId);
      const profile = await prisma.vocalProfile.findUniqueOrThrow({
        where: { id: claims[0]!.profileId },
        include: { recording: true },
      });
      assert.equal(profile.userId, memberId);
      assert.equal(profile.profileNumber, 3);
      assert.equal(profile.displayName, "보컬 프로필 3");
      assert.equal(
        (await prisma.mediaAsset.findUniqueOrThrow({ where: { id: profile.recording.mediaAssetId! } })).userId,
        memberId,
      );
      assert.equal(
        (await prisma.vocalProfileAnalysisJob.findUniqueOrThrow({ where: { id: job.id } })).userId,
        memberId,
      );
      assert.equal(await prisma.vocalProfile.count({ where: { userId: memberId } }), 1);
      assert.deepEqual(await prisma.ticketWallet.findMany({ where: { userId: memberId } }), before);
      assert.equal(await prisma.ticketLedger.count({ where: { userId: memberId } }), 0);
      await assert.rejects(() => claimGuestAnalysis(headers, otherId), /GUEST_TRIAL_ALREADY_SAVED/);
      assert.equal(await cleanupExpiredGuestAnalysis(new Date(Date.now() + 2 * 86_400_000)), false);
    } finally {
      await cleanupFixture([trial.userId, memberId, otherId]);
    }
  }));

test("expired results are denied before cleanup and deletion keeps the consumed identity", async () =>
  withFakeMedia(async () => {
    const { prisma, trial, headers, file } = await guestFixture();
    const { enqueueVocalProfileAnalysis, preflightVocalProfileAnalysis } = await import(
      "../src/features/analyze-vocal-profile/index.server"
    );
    const { canReadGuestResource, cleanupExpiredGuestAnalysis } = await import(
      "../src/entities/guest-analysis/index.server"
    );
    try {
      const job = await enqueueVocalProfileAnalysis({ userId: trial.userId, idempotencyKey: "expire", file });
      await completeGuestJob(job);
      const stored = await prisma.vocalProfileAnalysisJob.findUniqueOrThrow({ where: { id: job.id } });
      await prisma.guestAnalysisTrial.update({
        where: { id: trial.id },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });
      assert.equal(await canReadGuestResource(trial.userId, { profileId: stored.vocalProfileId! }), false);
      const { GET } = await import("../src/_app/api-routes/vocal-profiles/vocal-profile-audio-route");
      assert.equal(
        (
          await GET(new Request("http://localhost/audio", { headers }), {
            params: Promise.resolve({ id: stored.vocalProfileId! }),
          })
        ).status,
        404,
      );
      assert.equal(await cleanupExpiredGuestAnalysis(), true);
      assert.equal(await prisma.vocalProfile.count({ where: { userId: trial.userId } }), 0);
      assert.equal(await prisma.mediaAsset.count({ where: { userId: trial.userId } }), 0);
      assert.ok((await prisma.guestAnalysisTrial.findUniqueOrThrow({ where: { id: trial.id } })).consumedAt);
      await assert.rejects(() => preflightVocalProfileAnalysis(trial.userId, "again"), /GUEST_ANALYSIS_USED/);
    } finally {
      await cleanupFixture([trial.userId]);
    }
  }));

test("disabled daily quota rejects before reading the upload body and keeps member gates closed", async () =>
  withFakeMedia(async () => {
    const { trial, headers } = await guestFixture();
    process.env.GUEST_ANALYSIS_DAILY_LIMIT = "0";
    const { POST, GET } = await import("../src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route");
    let reads = 0;
    headers.set("Idempotency-Key", "paused");
    headers.set("Content-Type", "multipart/form-data; boundary=fixture");
    try {
      const request = new Request("http://localhost/api/vocal-profile-analysis-jobs", {
        method: "POST",
        headers,
        body: new ReadableStream(
          {
            pull() {
              reads += 1;
            },
          },
          { highWaterMark: 0 },
        ),
        duplex: "half",
      } as RequestInit);
      const response = await POST(request);
      assert.equal(response.status, 429);
      assert.equal((await response.json()).reasonCode, "GUEST_ANALYSIS_DAILY_LIMIT");
      assert.equal(reads, 0);
      const policy = await GET(new Request("http://localhost/api/vocal-profile-analysis-jobs", { headers }));
      assert.equal((await policy.json()).guest.state, "full");
      const { POST: mixing } = await import("../src/_app/api-routes/mixing-jobs/mixing-jobs-route");
      assert.equal(
        (await mixing(new Request("http://localhost/api/mixing-jobs", { method: "POST", headers }))).status,
        401,
      );
    } finally {
      await cleanupFixture([trial.userId]);
    }
  }));

test("last daily slot accepts one multipart submission, invalid uploads release it and replays stay idempotent", async () =>
  withFakeMedia(async () => {
    const { trial, headers, file } = await guestFixture();
    const { guestAnalysisQuota } = await import("../src/shared/lib/admission/index.server");
    const { POST } = await import("../src/_app/api-routes/vocal-profiles/vocal-profile-analysis-jobs-route");
    const held: ReturnType<typeof guestAnalysisQuota.reserve>[] = [];
    while (guestAnalysisQuota.policy(100).available) held.push(guestAnalysisQuota.reserve(100));
    held.pop()!.release();
    try {
      headers.set("Idempotency-Key", "last-slot");
      const invalid = new FormData();
      invalid.set("other", "no-audio");
      assert.equal(
        (
          await POST(
            new Request("http://localhost/api/vocal-profile-analysis-jobs", { method: "POST", headers, body: invalid }),
          )
        ).status,
        400,
      );
      assert.equal(guestAnalysisQuota.policy(100).available, true);
      const form = new FormData();
      form.set("audio", file);
      const accepted = await POST(
        new Request("http://localhost/api/vocal-profile-analysis-jobs", { method: "POST", headers, body: form }),
      );
      assert.equal(accepted.status, 202);
      const job = await accepted.json();
      assert.equal(guestAnalysisQuota.policy(100).available, false);
      const repeated = await POST(
        new Request("http://localhost/api/vocal-profile-analysis-jobs", { method: "POST", headers, body: form }),
      );
      assert.equal(repeated.status, 202);
      assert.equal((await repeated.json()).id, job.id);
    } finally {
      for (const reservation of held) reservation.release();
      await cleanupFixture([trial.userId]);
    }
  }));

test("a new member keeps signup grants unchanged when claiming a trial", async () =>
  withFakeMedia(async () => {
    const { prisma, trial, headers, file } = await guestFixture();
    const memberId = `new-member-${crypto.randomUUID()}`;
    const { enqueueVocalProfileAnalysis } = await import("../src/features/analyze-vocal-profile/index.server");
    const { ensureSignupTicketGrants } = await import("../src/entities/ticket/index.server");
    const { claimGuestAnalysis } = await import("../src/entities/guest-analysis/index.server");
    try {
      await prisma.user.create({ data: { id: memberId, name: "New member", email: `${memberId}@example.test` } });
      await ensureSignupTicketGrants(memberId);
      const before = await prisma.ticketLedger.findMany({ where: { userId: memberId }, orderBy: { id: "asc" } });
      const wallets = await prisma.ticketWallet.findMany({ where: { userId: memberId }, orderBy: { kind: "asc" } });
      const job = await enqueueVocalProfileAnalysis({ userId: trial.userId, idempotencyKey: "new-member", file });
      await completeGuestJob(job);
      const saved = await claimGuestAnalysis(headers, memberId);
      await claimGuestAnalysis(headers, memberId);
      assert.equal((await prisma.vocalProfile.findUniqueOrThrow({ where: { id: saved.profileId } })).profileNumber, 1);
      assert.deepEqual(
        await prisma.ticketLedger.findMany({ where: { userId: memberId }, orderBy: { id: "asc" } }),
        before,
      );
      assert.deepEqual(
        await prisma.ticketWallet.findMany({ where: { userId: memberId }, orderBy: { kind: "asc" } }),
        wallets,
      );
    } finally {
      await cleanupFixture([trial.userId, memberId]);
    }
  }));

test("guest recommendation reads remain owner-scoped and expire without external calls or quota/ledger/job mutations", async () =>
  withFakeMedia(async () => {
    const { prisma, trial, headers, file } = await guestFixture();
    const other = await guestFixture();
    const { enqueueVocalProfileAnalysis } = await import("../src/features/analyze-vocal-profile/index.server");
    const { GET } = await import("../src/_app/api-routes/recommendations/recommendation-detail-route");
    const { POST } = await import("../src/_app/api-routes/recommendations/recommendations-route");
    const { getRecommendationResult } = await import("../src/features/create-recommendation/index.server");
    const { guestAnalysisQuota } = await import("../src/shared/lib/admission/index.server");
    try {
      const job = await enqueueVocalProfileAnalysis({ userId: trial.userId, idempotencyKey: "recommend", file });
      await completeGuestJob(job);
      const profileId = (await prisma.vocalProfileAnalysisJob.findUniqueOrThrow({ where: { id: job.id } }))
        .vocalProfileId!;
      const context = { params: Promise.resolve({ id: profileId }) };
      const before = {
        jobs: await prisma.vocalProfileAnalysisJob.count({ where: { userId: trial.userId } }),
        mixing: await prisma.mixingJob.count({ where: { userId: trial.userId } }),
        ledger: await prisma.ticketLedger.count({ where: { userId: trial.userId } }),
        quota: guestAnalysisQuota.policy(100).available,
      };
      const priorFetch = globalThis.fetch;
      let externalCalls = 0;
      globalThis.fetch = (async () => {
        externalCalls += 1;
        throw new Error("Recommendation must not call external services");
      }) as typeof fetch;
      // Closing new daily admissions must not close recommendations for an existing trial.
      process.env.GUEST_ANALYSIS_DAILY_LIMIT = "0";
      try {
        const response = await GET(
          new Request(`http://localhost/api/recommendations/${profileId}`, { headers }),
          context,
        );
        assert.equal(response.status, 200);
        const run = await response.json();
        assert.ok(run.items.length > 0);
        assert.equal(run.items.length, (await getRecommendationResult(profileId, trial.userId)).items.length);
        assert.equal(run.userVocalProfileId, profileId);
        assert.ok(
          run.items.every((item: { synthesis: { status: string } }) => item.synthesis.status === "not_started"),
        );
        const jsonHeaders = new Headers(headers);
        jsonHeaders.set("Content-Type", "application/json");
        assert.equal(
          (
            await POST(
              new Request("http://localhost/api/recommendations", {
                method: "POST",
                headers: jsonHeaders,
                body: JSON.stringify({ userVocalProfileId: profileId }),
              }),
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await GET(
              new Request(`http://localhost/api/recommendations/${profileId}`, { headers: other.headers }),
              context,
            )
          ).status,
          404,
        );
        assert.equal(
          (await GET(new Request(`http://localhost/api/recommendations/${profileId}`), context)).status,
          401,
        );
        await prisma.guestAnalysisTrial.update({
          where: { id: trial.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        assert.equal(
          (await GET(new Request(`http://localhost/api/recommendations/${profileId}`, { headers }), context)).status,
          404,
        );
        await assert.rejects(() => getRecommendationResult(profileId, trial.userId), /not found/);
        assert.equal(externalCalls, 0);
      } finally {
        globalThis.fetch = priorFetch;
      }
      assert.deepEqual(
        {
          jobs: await prisma.vocalProfileAnalysisJob.count({ where: { userId: trial.userId } }),
          mixing: await prisma.mixingJob.count({ where: { userId: trial.userId } }),
          ledger: await prisma.ticketLedger.count({ where: { userId: trial.userId } }),
          quota: guestAnalysisQuota.policy(100).available,
        },
        before,
      );
      const { POST: mix } = await import("../src/_app/api-routes/mixing-jobs/mixing-jobs-route");
      assert.equal(
        (await mix(new Request("http://localhost/api/mixing-jobs", { method: "POST", headers }))).status,
        401,
      );
    } finally {
      await cleanupFixture([trial.userId, other.trial.userId]);
    }
  }));
