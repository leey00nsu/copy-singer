export const runtime = "nodejs";

import { devSvcEnabled, devSvcUnavailable } from "@/features/development-conversion/index.server";

function modalConfig() {
  const url = process.env.MODAL_API_URL?.replace(/\/$/, "");
  const key = process.env.MODAL_API_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!devSvcEnabled()) return devSvcUnavailable();
  const config = modalConfig();
  if (!config) return Response.json({ detail: "Modal API is not configured." }, { status: 503 });
  const { id } = await context.params;
  const range = request.headers.get("Range");
  const response = await fetch(`${config.url}/v1/conversions/${encodeURIComponent(id)}/audio`, {
    headers: {
      "X-API-Key": config.key,
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
  });

  const headers = new Headers();
  for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Content-Disposition"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}
