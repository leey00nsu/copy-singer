import "server-only";
import type { Prisma } from "@/shared/db/index.server";
import { positiveInteger } from "../runtime/limits";
import { AdmissionError } from "./limiter";

export type QueueKind = "VOCAL" | "MIXING" | "SONG";
export async function lockQueueAdmission(tx: Prisma.TransactionClient, kind: QueueKind) {
  // Take this before reads; SERIALIZABLE callers also retry snapshot/write conflicts.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`copy-singer:admission:${kind}`}, 0))`;
}
export async function checkQueueCapacity(tx: Prisma.TransactionClient, kind: QueueKind, userId?: string) {
  const globalLimit = positiveInteger(`${kind}_QUEUE_CAPACITY`, kind === "SONG" ? 50 : 20, 10_000);
  const userLimit = positiveInteger(`${kind}_USER_QUEUE_CAPACITY`, kind === "VOCAL" ? 1 : 3, 100);
  const statuses = kind === "MIXING" ? ["PENDING", "PREPARING", "SUBMITTED", "PROCESSING"] : ["PENDING", "PROCESSING"];
  const table = kind === "VOCAL" ? "VocalProfileAnalysisJob" : kind === "MIXING" ? "MixingJob" : "SongAnalysisJob";
  const counts = await tx.$queryRawUnsafe<Array<{ total: bigint; owned: bigint }>>(
    `SELECT count(*) AS total, count(*) FILTER (WHERE ${kind === "SONG" ? "FALSE" : '"userId" = $2'}) AS owned FROM "${table}" WHERE status = ANY($1::"${table}Status"[])`,
    statuses,
    ...(kind === "SONG" ? [] : [userId ?? ""]),
  );
  if (Number(counts[0]?.owned) >= userLimit) throw new AdmissionError("USER_QUEUE_CAPACITY", 429);
  if (Number(counts[0]?.total) >= globalLimit) throw new AdmissionError("QUEUE_CAPACITY", 503, 30);
}
