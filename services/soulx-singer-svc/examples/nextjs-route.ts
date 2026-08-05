// app/api/conversions/route.ts
// Keep MODAL_API_KEY server-side. Never prefix it with NEXT_PUBLIC_.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const incoming = await request.formData();
  const response = await fetch(`${process.env.MODAL_API_URL}/v1/conversions`, {
    method: "POST",
    headers: { "X-API-Key": process.env.MODAL_API_KEY! },
    body: incoming,
    cache: "no-store",
  });

  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
  });
}
