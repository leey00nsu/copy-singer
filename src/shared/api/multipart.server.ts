import "server-only";

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

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new MultipartBodyTooLargeError(maxBodyBytes);
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBodyBytes) {
        await reader.cancel("multipart body limit exceeded").catch(() => undefined);
        throw new MultipartBodyTooLargeError(maxBodyBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
}
