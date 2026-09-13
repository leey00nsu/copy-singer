import "server-only";
import { songAnalysisModalConfig } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";

export async function reconcileExternalJobs(fetchImpl: typeof fetch = fetch) {
  const records = await prisma.externalJobReconciliation.findMany({
    where: { status: "PENDING" },
    take: 20,
    orderBy: { createdAt: "asc" },
  });
  for (const record of records) {
    const job =
      record.jobType === "MIXING"
        ? await prisma.mixingJob.findUnique({ where: { id: record.jobId }, select: { status: true } })
        : await prisma.songAnalysisJob.findUnique({ where: { id: record.jobId }, select: { status: true } });
    if (job && !["FAILED", "SUCCEEDED", "CANCELED"].includes(job.status)) continue;
    if (!record.externalJobId) {
      await prisma.externalJobReconciliation.updateMany({
        where: { id: record.id, status: "PENDING" },
        data: { status: "UNRESOLVED" },
      });
      continue;
    }
    const song = record.jobType === "SONG" ? songAnalysisModalConfig() : null;
    const url = record.jobType === "MIXING" ? process.env.MODAL_API_URL : song?.url;
    const key = record.jobType === "MIXING" ? process.env.MODAL_API_KEY : song?.apiKey;
    try {
      if (!url || !key) throw new Error("DEPENDENCY_NOT_CONFIGURED");
      const response = await fetchImpl(
        `${url.replace(/\/$/, "")}/v1/${record.jobType === "MIXING" ? "conversions" : "jobs"}/${encodeURIComponent(record.externalJobId)}`,
        {
          method: "DELETE",
          headers: { "X-API-Key": key },
          signal: AbortSignal.timeout(15_000),
        },
      );
      await response.body?.cancel();
      if (!response.ok && response.status !== 404 && response.status !== 410)
        throw new Error("EXTERNAL_CLEANUP_FAILED");
      await prisma.externalJobReconciliation.updateMany({
        where: { id: record.id, status: "PENDING" },
        data: { status: "CLEANED" },
      });
    } catch {
      await prisma.externalJobReconciliation.updateMany({
        where: { id: record.id, status: "PENDING" },
        data: { status: "UNRESOLVED", resolution: "AUTO_CLEANUP_FAILED_REQUIRES_OPERATOR" },
      });
    }
  }
}
