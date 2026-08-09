export const runtime = "nodejs";

import { listAdminMixingJobs } from "@/lib/admin/service";
import { requireAdminApi } from "@/lib/auth/admin";

export async function GET(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  const url = new URL(request.url);
  const result = await listAdminMixingJobs(
    url.searchParams.get("q") ?? "",
    url.searchParams.get("status") ?? "",
    Number(url.searchParams.get("page") ?? "1"),
  );
  return Response.json({
    ...result,
    jobs: result.jobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
    })),
  });
}
