import assert from "node:assert/strict";
import test from "node:test";

import { submitAdminCustomMixing } from "../src/features/admin-custom-mixing/api/modal";

test("the admin custom mixing adapter forwards reference and target to Modal without persisting the target", async () => {
  const previous = {
    modalKey: process.env.MODAL_API_KEY,
    modalUrl: process.env.MODAL_API_URL,
  };
  const originalFetch = globalThis.fetch;
  process.env.MODAL_API_URL = "https://modal.example";
  process.env.MODAL_API_KEY = "test-key";

  try {
    let upstreamUrl = "";
    let upstreamHeaders: Headers | undefined;
    let upstreamForm: FormData | undefined;
    globalThis.fetch = async (input, init) => {
      upstreamUrl = String(input);
      upstreamHeaders = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
      upstreamForm = init?.body instanceof FormData ? init.body : undefined;
      return Response.json({ id: "modal-job-1", status: "queued" }, { status: 202 });
    };

    const reference = {
      externalUrl: "https://storage.example/reference.wav",
      mimeType: "audio/wav",
      fileName: "reference.wav",
    };
    const target = new File([new Uint8Array(1_024)], "custom-target.wav", { type: "audio/wav" });

    const response = await submitAdminCustomMixing(reference, target);
    assert.ok(response, "expected a fetch response");
    assert.equal(response.status, 202);
    assert.equal(upstreamUrl, "https://modal.example/v1/conversions");
    assert.equal(upstreamHeaders?.get("X-API-Key"), "test-key");
    assert.ok(upstreamForm, "expected a FormData upstream body");
    assert.equal(upstreamForm?.get("profileId"), null);
    const prompt = upstreamForm?.get("prompt_audio");
    assert.ok(prompt instanceof File);
    assert.equal(prompt.name, "reference.wav");
    const upstreamTarget = upstreamForm?.get("target_audio");
    assert.ok(upstreamTarget instanceof File);
    assert.equal(upstreamTarget.name, "custom-target.wav");
    assert.equal(upstreamForm?.get("auto_mix_accompaniment"), "true");
    assert.equal(upstreamForm?.get("steps"), "32");
    assert.deepEqual(await response.json(), { id: "modal-job-1", status: "queued" });
  } finally {
    globalThis.fetch = originalFetch;
    if (previous.modalKey === undefined) delete process.env.MODAL_API_KEY;
    else process.env.MODAL_API_KEY = previous.modalKey;
    if (previous.modalUrl === undefined) delete process.env.MODAL_API_URL;
    else process.env.MODAL_API_URL = previous.modalUrl;
  }
});
