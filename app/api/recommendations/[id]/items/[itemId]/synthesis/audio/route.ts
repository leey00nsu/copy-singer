import { RecommendationError } from "@/lib/recommendation/contract";
import { recommendationSynthesisAudio } from "@/lib/recommendation/synthesis";

export async function GET(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await context.params;
  try {
    const upstream = await recommendationSynthesisAudio(id, itemId, request.headers.get("Range"));
    const headers = new Headers();
    for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Content-Disposition"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    if (error instanceof RecommendationError) {
      return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.status });
    }
    return Response.json({ error: { code: "SYNTHESIS_UPSTREAM_FAILED", message: "합성 결과를 불러오지 못했습니다.", retryable: true } }, { status: 502 });
  }
}
