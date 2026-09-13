import { parseArgs } from "node:util";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const { values } = parseArgs({
  options: {
    id: { type: "string" },
    outcome: { type: "string" },
    operator: { type: "string" },
    reason: { type: "string" },
    apply: { type: "boolean", default: false },
  },
});
const { prisma } = await import("../src/shared/db/index.server");
try {
  if (!values.id) {
    console.log(
      JSON.stringify(
        await prisma.externalJobReconciliation.findMany({
          where: { status: { in: ["PENDING", "UNRESOLVED"] } },
          take: 100,
          orderBy: { createdAt: "asc" },
        }),
      ),
    );
  } else {
    const id = values.id;
    const outcome = values.outcome;
    if (
      !outcome ||
      !["submitted", "not-submitted", "cleaned"].includes(outcome) ||
      !values.operator?.trim() ||
      !values.reason?.trim()
    )
      throw new Error("Required: --outcome submitted|not-submitted|cleaned --operator NAME --reason VERIFIED_EVIDENCE");
    const { applyTicketChangeInTransaction } = await import("../src/entities/ticket/index.server");
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "ExternalJobReconciliation" WHERE id = ${id}::uuid FOR UPDATE`;
      const record = await tx.externalJobReconciliation.findUniqueOrThrow({ where: { id } });
      if (record.status.startsWith("RESOLVED_")) {
        if (record.status !== `RESOLVED_${outcome}`) throw new Error("Conflicting prior resolution");
        return { action: "NOOP", id };
      }
      const job = record.jobType === "MIXING" ? await tx.mixingJob.findUnique({ where: { id: record.jobId } }) : null;
      if (job && !["FAILED", "SUCCEEDED", "CANCELED"].includes(job.status))
        throw new Error("Active jobs cannot be reconciled.");
      if (
        outcome === "not-submitted" &&
        record.jobType === "MIXING" &&
        (!job || job.status !== "FAILED" || job.modalJobId || job.submissionState === "SUBMITTED")
      )
        throw new Error("Missing/confirmed job cannot be treated as not submitted.");
      if (!values.apply)
        return { action: "DRY_RUN", id, outcome, refund: outcome === "not-submitted" ? (job?.ticketCost ?? 0) : 0 };
      if (job && outcome === "not-submitted") {
        await applyTicketChangeInTransaction(tx, {
          userId: job.userId,
          kind: "AI_MIXING",
          type: "USAGE_REFUND",
          amount: job.ticketCost,
          idempotencyKey: `mixing:refund:${job.id}`,
          mixingJobId: job.id,
          reason: `접수 미확인 복구 (${values.operator}): ${values.reason}`,
        });
        await tx.mixingJob.update({
          where: { id: job.id, status: "FAILED" },
          data: {
            refundState: "REFUNDED",
            submissionState: "NOT_SUBMITTED",
            errorCode: "MODAL_NOT_SUBMITTED_CONFIRMED",
          },
        });
      } else if (job?.errorCode === "MODAL_SUBMISSION_UNCONFIRMED") {
        await tx.mixingJob.update({
          where: { id: job.id, status: "FAILED" },
          data: { errorCode: "MODAL_SUBMISSION_REVIEWED" },
        });
      }
      await tx.externalJobReconciliation.update({
        where: { id },
        data: { status: `RESOLVED_${outcome}`, resolution: `${values.operator}: ${values.reason}` },
      });
      return { action: "RESOLVED", id, outcome };
    });
    console.log(JSON.stringify(result));
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Reconciliation failed");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
