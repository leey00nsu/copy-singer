export const runtime = "nodejs";

import { vocalProfileAnalyzerHealth } from "@/entities/vocal-profile/index.server";
import { prisma } from "@/shared/db/index.server";

export async function GET() {
  const [analyzer, database] = await Promise.allSettled([vocalProfileAnalyzerHealth(), prisma.$queryRaw`SELECT 1`]);

  const healthy = analyzer.status === "fulfilled" && database.status === "fulfilled";
  return Response.json(
    {
      status: healthy ? "ok" : "unavailable",
      analyzer: analyzer.status === "fulfilled" ? "ok" : "unavailable",
      analyzerBackend: analyzer.status === "fulfilled" ? analyzer.value.backend : null,
      database: database.status === "fulfilled" ? "ok" : "unavailable",
    },
    { status: healthy ? 200 : 503 },
  );
}
