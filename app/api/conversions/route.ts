function modalConfig() {
  const url = process.env.MODAL_API_URL?.replace(/\/$/, "");
  const key = process.env.MODAL_API_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function POST(request: Request) {
  const config = modalConfig();
  if (!config) {
    return Response.json(
      { detail: "Modal API is not configured. Add MODAL_API_URL and MODAL_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  const incoming = await request.formData();
  const response = await fetch(`${config.url}/v1/conversions`, {
    method: "POST",
    headers: { "X-API-Key": config.key },
    body: incoming,
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}

