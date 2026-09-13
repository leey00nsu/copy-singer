import "server-only";
import { runtimeLimits } from "@/shared/lib/runtime/index.server";

export class MultipartBodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Multipart request body exceeds ${maxBytes} bytes.`);
    this.name = "MultipartBodyTooLargeError";
  }
}

export const MULTIPART_FORM_OVERHEAD_BYTES = 1024 * 1024;

export function multipartBodyLimit(fileLimitBytes: number) {
  return fileLimitBytes + MULTIPART_FORM_OVERHEAD_BYTES;
}

export async function readBoundedMultipartFormData(request: Request, maxBodyBytes: number) {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data") || !request.body) {
    throw new TypeError("Expected a multipart form body.");
  }

  const bytes = await readBoundedRequestBytes(request, maxBodyBytes, runtimeLimits().uploadMs);
  return new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
}

export async function readBoundedRequestBytes(request: Request, maxBodyBytes: number, timeoutMs: number) {
  if (!request.body) throw new TypeError("Request body is required.");
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new MultipartBodyTooLargeError(maxBodyBytes);
  }

  const reader = request.body.getReader();
  let abortReason: unknown;
  const abort = () => {
    abortReason = request.signal.reason ?? new DOMException("Upload canceled", "AbortError");
    void reader.cancel(abortReason).catch(() => undefined);
  };
  const timer = setTimeout(() => {
    abortReason = new DOMException("Upload deadline exceeded", "TimeoutError");
    void reader.cancel(abortReason).catch(() => undefined);
  }, timeoutMs);
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (abortReason) throw abortReason;
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBodyBytes) {
        await reader.cancel("multipart body limit exceeded").catch(() => undefined);
        throw new MultipartBodyTooLargeError(maxBodyBytes);
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

export async function readBoundedJson(request: Request) {
  const bytes = await readBoundedRequestBytes(request, 1024 * 1024, runtimeLimits().metadataMs);
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
