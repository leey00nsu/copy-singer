import assert from "node:assert/strict";
import test from "node:test";

test("the conversion proxy forwards a long upload stream without reading or replacing it", async () => {
  const previous = {
    enabled: process.env.ENABLE_DEV_SVC,
    modalKey: process.env.MODAL_API_KEY,
    modalUrl: process.env.MODAL_API_URL,
  };
  const originalFetch = globalThis.fetch;
  process.env.ENABLE_DEV_SVC = "true";
  process.env.MODAL_API_URL = "https://modal.example";
  process.env.MODAL_API_KEY = "test-key";

  try {
    const { POST } = await import("@/_app/api-routes/conversions/conversions-route");
    let upstreamBody: BodyInit | null | undefined;
    globalThis.fetch = async (_input, init) => {
      upstreamBody = init?.body;
      return Response.json({ id: "modal-job-long", status: "queued" }, { status: 202 });
    };

    let remainingChunks = 64;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (remainingChunks === 0) {
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(1_048_576));
        remainingChunks -= 1;
      },
    });
    const request = new Request("http://copy-singer.test/api/conversions", {
      method: "POST",
      headers: {
        "content-length": String(64 * 1_048_576),
        "content-type": "multipart/form-data; boundary=long-audio-fixture",
      },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    const requestBody = request.body;

    const response = await POST(request);
    assert.equal(response.status, 202);
    assert.equal(upstreamBody, requestBody);
    assert.deepEqual(await response.json(), { id: "modal-job-long", status: "queued" });
  } finally {
    globalThis.fetch = originalFetch;
    if (previous.enabled === undefined) delete process.env.ENABLE_DEV_SVC;
    else process.env.ENABLE_DEV_SVC = previous.enabled;
    if (previous.modalKey === undefined) delete process.env.MODAL_API_KEY;
    else process.env.MODAL_API_KEY = previous.modalKey;
    if (previous.modalUrl === undefined) delete process.env.MODAL_API_URL;
    else process.env.MODAL_API_URL = previous.modalUrl;
  }
});
