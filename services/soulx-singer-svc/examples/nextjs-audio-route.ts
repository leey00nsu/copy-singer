// app/api/conversions/[id]/audio/route.ts
export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const response = await fetch(`${process.env.MODAL_API_URL}/v1/conversions/${encodeURIComponent(id)}/audio`, {
    headers: { "X-API-Key": process.env.MODAL_API_KEY! },
    cache: "no-store",
  });
  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": response.headers.get("Content-Disposition") ?? "inline",
    },
  });
}
