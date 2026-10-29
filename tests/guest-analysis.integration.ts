import assert from "node:assert/strict";
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
