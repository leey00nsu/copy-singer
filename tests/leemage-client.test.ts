import assert from "node:assert/strict";
import test from "node:test";

import { LeemageClient } from "../src/shared/media/index.leemage-client.server";

test("LeemageClient uploads a non-image file through presign, PUT, and confirm", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/files/presign")) {
      return Response.json({
        presignedUrl: "https://objects.example/upload",
        objectName: "project/file-source-wav.wav",
        objectUrl: "https://objects.example/file.wav",
        fileId: "file-1",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
    }
    if (url === "https://objects.example/upload") return new Response(null, { status: 200 });
    if (url.endsWith("/files/confirm")) {
      return Response.json(
        {
          message: "File upload complete",
          file: { id: "file-1", url: "https://objects.example/file.wav" },
        },
        { status: 201 },
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const client = new LeemageClient(
    { baseUrl: "https://leemage.example/api/v1", apiKey: "secret", projectId: "project" },
    fetchImpl,
  );
  const stored = await client.uploadFile({
    fileName: "reference.wav",
    mimeType: "audio/wav",
    bytes: new Uint8Array([1, 2, 3]),
  });

  assert.deepEqual(stored, {
    projectId: "project",
    fileId: "file-1",
    url: "https://objects.example/file.wav",
    fileName: "reference.wav",
    mimeType: "audio/wav",
    sizeBytes: 3,
  });
  assert.equal(calls.length, 3);
  assert.equal(new Headers(calls[0]!.init?.headers).get("Authorization"), "Bearer secret");
  assert.equal(new Headers(calls[1]!.init?.headers).get("Authorization"), null);
  assert.equal(new Headers(calls[1]!.init?.headers).get("Content-Type"), "audio/wav");
  assert.equal(new Headers(calls[2]!.init?.headers).get("Authorization"), "Bearer secret");
});

test("LeemageClient honors retryable 429 responses before deleting", async () => {
  let attempts = 0;
  const fetchImpl: typeof fetch = async () => {
    attempts += 1;
    return attempts === 1
      ? Response.json({ message: "slow down" }, { status: 429, headers: { "Retry-After": "0" } })
      : Response.json({ message: "deleted" });
  };
  const client = new LeemageClient(
    { baseUrl: "https://leemage.example/api/v1", apiKey: "secret", projectId: "project" },
    fetchImpl,
  );
  await client.deleteFile("project", "file-1");
  assert.equal(attempts, 2);
});
