import { withApiAdmission } from "@/_app/api-routes/admission";
import { requireAdminApi } from "@/features/authentication/index.server";
import { listAdminMixingJobs } from "@/features/inspect-admin-operations/index.server";

async function handleGET(request: Request) {
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

export const GET = withApiAdmission(handleGET);
