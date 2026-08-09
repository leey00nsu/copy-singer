import { devSvcEnabled, devSvcUnavailable } from "@/features/development-conversion/index.server";

function modalConfig() {
  const url = process.env.MODAL_API_URL?.replace(/\/$/, "");
  const key = process.env.MODAL_API_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!devSvcEnabled()) return devSvcUnavailable();
  const config = modalConfig();
  if (!config) return Response.json({ detail: "Modal API is not configured." }, { status: 503 });
  const { id } = await context.params;
  const response = await fetch(`${config.url}/v1/conversions/${encodeURIComponent(id)}`, {
    headers: { "X-API-Key": config.key },
    cache: "no-store",
  });
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  if (!devSvcEnabled()) return devSvcUnavailable();
  const config = modalConfig();
  if (!config) return Response.json({ detail: "Modal API is not configured." }, { status: 503 });
  const { id } = await context.params;
  const response = await fetch(`${config.url}/v1/conversions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "X-API-Key": config.key },
    cache: "no-store",
  });
  return new Response(response.body, { status: response.status });
}
