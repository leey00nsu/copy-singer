import assert from "node:assert/strict";
import test from "node:test";

import { proxyPrivateAudio } from "../lib/leemage/audio-proxy";

test("private audio proxy forwards Range without exposing the storage URL", async () => {
  let forwardedRange: string | null = null;
  const fetchImpl: typeof fetch = async (_request, init) => {
    forwardedRange = new Headers(init?.headers).get("Range");
    return new Response(new Uint8Array([1, 2]), {
      status: 206,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": "2",
        "Content-Range": "bytes 0-1/3",
        "Accept-Ranges": "bytes",
        "X-Storage-URL": "https://objects.example/private.wav",
      },
    });
  };
  const response = await proxyPrivateAudio({
    request: new Request("http://localhost/audio", { headers: { Range: "bytes=0-1" } }),
    externalUrl: "https://objects.example/private.wav",
    mimeType: "audio/wav",
    fileName: "profile.wav",
    fetchImpl,
  });
  assert.ok(response);
  assert.equal(forwardedRange, "bytes=0-1");
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "bytes 0-1/3");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("X-Storage-URL"), null);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2]));
});

test("private audio proxy reports an unavailable upstream without forwarding its body", async () => {
  const response = await proxyPrivateAudio({
    request: new Request("http://localhost/audio"),
    externalUrl: "https://objects.example/private.wav",
    mimeType: "audio/wav",
    fileName: "profile.wav",
    fetchImpl: async () => new Response("storage details", { status: 503 }),
  });
  assert.equal(response, null);
});
