import "server-only";
import { type Prisma, prisma } from "@/shared/db/index.server";

export type JobTable = "MixingJob" | "VocalProfileAnalysisJob" | "SongAnalysisJob";
const active = "('PENDING', 'PREPARING', 'SUBMITTED', 'PROCESSING')";
function tableName(table: JobTable) {
  if (!["MixingJob", "VocalProfileAnalysisJob", "SongAnalysisJob"].includes(table))
    throw new Error("Invalid job table");
  return `"${table}"`;
}
export class LeaseLostError extends Error {
  constructor() {
    super("JOB_LEASE_LOST");
  }
}
export class JobDeadlineError extends Error {
  constructor() {
    super("JOB_DEADLINE_EXCEEDED");
  }
}

export async function fenceJob(
  tx: Prisma.TransactionClient,
  table: JobTable,
  id: string,
  owner: string | null,
  allowDeadline = false,
) {
  const rows = await tx.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM ${tableName(table)} WHERE id = $1::uuid AND "leaseOwner" = $2 AND "leaseExpiresAt" > clock_timestamp()
      AND status::text IN ${active} ${allowDeadline ? "" : 'AND ("deadlineAt" IS NULL OR "deadlineAt" > clock_timestamp())'} FOR UPDATE`,
    id,
    owner,
  );
  if (rows.length !== 1) throw new LeaseLostError();
}

export async function startJobLease(table: JobTable, id: string, owner: string, seconds: number, parent?: AbortSignal) {
  await prisma.$transaction((tx) => fenceJob(tx, table, id, owner, true));
  const rows = await prisma.$queryRawUnsafe<Array<{ deadlineAt: Date | null }>>(
    `SELECT "deadlineAt" FROM ${tableName(table)} WHERE id = $1::uuid AND "leaseOwner" = $2`,
    id,
    owner,
  );
  if (!rows[0]) throw new LeaseLostError();
  const controller = new AbortController();
  const parentAbort = () => controller.abort(parent?.reason);
  if (parent?.aborted) parentAbort();
  else parent?.addEventListener("abort", parentAbort, { once: true });
  const deadline = rows[0].deadlineAt?.getTime() ?? Date.now() + 75 * 60_000;
  const deadlineTimer = setTimeout(() => controller.abort(new JobDeadlineError()), Math.max(1, deadline - Date.now()));
  let stopped = false;
  let pending: Promise<void> = Promise.resolve();
  const renew = async () => {
    const count = await prisma.$executeRawUnsafe(
      `UPDATE ${tableName(table)} SET "heartbeatAt" = clock_timestamp(), "leaseExpiresAt" = clock_timestamp() + $3 * interval '1 second'
      WHERE id = $1::uuid AND "leaseOwner" = $2 AND "leaseExpiresAt" > clock_timestamp() AND status::text IN ${active}`,
      id,
      owner,
      seconds,
    );
    if (count !== 1) throw new LeaseLostError();
  };
  const interval = setInterval(
    () => {
      pending = pending
        .then(async () => {
          if (!stopped) await renew();
        })
        .catch(() => controller.abort(new LeaseLostError()));
    },
    Math.min(30_000, (seconds * 1_000) / 3),
  );
  interval.unref();
  return {
    signal: controller.signal,
    check() {
      if (Date.now() >= deadline) throw new JobDeadlineError();
      controller.signal.throwIfAborted();
    },
    fetch(fetchImpl: typeof fetch): typeof fetch {
      return (url, init) => {
        controller.signal.throwIfAborted();
        return fetchImpl(url, {
          ...init,
          signal: init?.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal,
        });
      };
    },
    async stop() {
      stopped = true;
      clearInterval(interval);
      clearTimeout(deadlineTimer);
      parent?.removeEventListener("abort", parentAbort);
      await pending;
    },
  };
}
