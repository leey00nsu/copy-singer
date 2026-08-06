export const runtime = "nodejs";

export async function GET() {
  const url = process.env.MODAL_API_URL?.replace(/\/$/, "");
  if (!url) return Response.json({ status: "not_configured" }, { status: 503 });

  try {
    const response = await fetch(`${url}/health`, { cache: "no-store" });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 502 });
  }
}
