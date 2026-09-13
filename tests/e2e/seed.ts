import { createHmac } from "node:crypto";
import { writeFileSync } from "node:fs";
import { importDatabaseSongCatalog } from "../../src/entities/song-catalog/index.server";
import { ensureSignupTicketGrants } from "../../src/entities/ticket/index.server";
import { prisma } from "../../src/shared/db/index.server";
import { syntheticCatalogSnapshot } from "../fixtures/synthetic-song-catalog";

const database = new URL(process.env.DATABASE_URL ?? "");
if (database.hostname !== "127.0.0.1" || !database.pathname.startsWith("/e2e_")) throw new Error("E2E DB required");
try {
  const snapshot = syntheticCatalogSnapshot(100);
  for (const song of snapshot.songs) {
    Object.assign(song.analysis, {
      minMidi: 45,
      p10Midi: 50,
      medianMidi: 60,
      p90Midi: 70,
      maxMidi: 75,
      tessituraLowMidi: 53,
      tessituraHighMidi: 67,
    });
    song.targetAsset.externalUrl = `${process.env.E2E_PROVIDER}/catalog.wav`;
    song.targetAsset.mimeType = "audio/wav";
    song.targetAsset.fileName = "catalog.wav";
  }
  await importDatabaseSongCatalog(prisma, snapshot);
  const accounts: Record<string, { cookie: string; id: string }> = {};
  for (const name of ["owner", "other", "failure"]) {
    const id = `e2e-${name}`,
      token = `e2e-session-${name}`;
    await prisma.user.create({
      data: {
        id,
        name: `E2E ${name}`,
        email: `${name}@example.test`,
        emailVerified: true,
        onboardingCompletedAt: new Date(),
      },
    });
    await ensureSignupTicketGrants(id);
    await prisma.session.create({
      data: { id: crypto.randomUUID(), userId: id, token, expiresAt: new Date(Date.now() + 3600_000) },
    });
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(token).digest("base64");
    accounts[name] = { id, cookie: encodeURIComponent(`${token}.${signature}`) };
  }
  writeFileSync(process.env.E2E_ACCOUNTS!, JSON.stringify(accounts));
} finally {
  await prisma.$disconnect();
}
