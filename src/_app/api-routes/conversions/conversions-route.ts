import { devSvcEnabled, devSvcUnavailable } from "@/features/development-conversion/index.server";

function modalConfig() {
  const url = process.env.MODAL_API_URL?.replace(/\/$/, "");
  const key = process.env.MODAL_API_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function POST(request: Request) {
  if (!devSvcEnabled()) return devSvcUnavailable();
  const config = modalConfig();
  if (!config) {
    return Response.json({ detail: "The conversion API is not configured." }, { status: 503 });
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.startsWith("multipart/form-data") || !request.body) {
    return Response.json({ detail: "Expected a multipart audio upload." }, { status: 400 });
  }

  // Preserve the original multipart boundary and stream the upload to the conversion service.
  // Parsing with request.formData() buffers both audio files in the web worker
  // before sending them upstream, which is especially costly for WAV files.
  const upstreamRequest: RequestInit & { duplex: "half" } = {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "X-API-Key": config.key,
    },
    body: request.body,
    duplex: "half",
    cache: "no-store",
  };
  const response = await fetch(`${config.url}/v1/conversions`, upstreamRequest);

  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}
