import { prisma } from "@/lib/db/prisma";
import { analyzerUrl } from "@/lib/vocal-profile/server";

export async function GET() {
  const url = analyzerUrl();
  if (!url) return Response.json({ status: "not_configured" }, { status: 503 });

  const [analyzer, database] = await Promise.allSettled([
    fetch(`${url}/health`, { cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error("Analyzer health failed.");
      return response.json();
    }),
    prisma.$queryRaw`SELECT 1`,
  ]);

  const healthy = analyzer.status === "fulfilled" && database.status === "fulfilled";
  return Response.json(
    {
      status: healthy ? "ok" : "unavailable",
      analyzer: analyzer.status === "fulfilled" ? "ok" : "unavailable",
      database: database.status === "fulfilled" ? "ok" : "unavailable",
    },
    { status: healthy ? 200 : 503 },
  );
}
