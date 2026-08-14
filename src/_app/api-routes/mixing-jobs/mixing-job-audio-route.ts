import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { prisma } from "@/shared/db/index.server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const job = await prisma.mixingJob.findFirst({
    where: { id: (await context.params).id, userId: session.user.id, status: "SUCCEEDED" },
    include: { resultAsset: true },
  });
  if (!job?.resultAsset || job.resultAsset.status !== "READY") {
    return Response.json(
      { error: { code: "MIXING_RESULT_NOT_FOUND", message: "완료된 믹싱 결과를 찾을 수 없어요." } },
      { status: 404 },
    );
  }
  const range = request.headers.get("Range");
  const upstream = await fetch(job.resultAsset.externalUrl, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!upstream.ok && upstream.status !== 206) {
    return Response.json(
      { error: { code: "MIXING_RESULT_UNAVAILABLE", message: "믹싱 결과를 불러오지 못했어요." } },
      { status: 502 },
    );
  }
  const headers = new Headers();
  for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Content-Disposition", `inline; filename="${job.resultAsset.fileName}"`);
  headers.set("Cache-Control", "private, no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
}
