// app/api/conversions/[id]/route.ts
export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const response = await fetch(`${process.env.MODAL_API_URL}/v1/conversions/${encodeURIComponent(id)}`, {
    headers: { "X-API-Key": process.env.MODAL_API_KEY! },
    cache: "no-store",
  });
  return Response.json(await response.json(), { status: response.status });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const response = await fetch(`${process.env.MODAL_API_URL}/v1/conversions/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "X-API-Key": process.env.MODAL_API_KEY! },
    cache: "no-store",
  });
  return new Response(null, { status: response.status });
}
