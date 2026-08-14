import assert from "node:assert/strict";
import test from "node:test";
import {
  MultipartBodyTooLargeError,
  multipartBodyLimit,
  readBoundedMultipartFormData,
} from "../src/shared/api/multipart.server";

test("bounded multipart reader parses a valid form within the byte budget", async () => {
  const form = new FormData();
  form.append("audio", new File([Uint8Array.from([1, 2, 3, 4])], "voice.wav", { type: "audio/wav" }));
  const request = new Request("http://copy-singer.test/upload", { method: "POST", body: form });

  const parsed = await readBoundedMultipartFormData(request, multipartBodyLimit(4));
  const audio = parsed.get("audio");
  assert.ok(audio instanceof File);
  assert.equal(audio.name, "voice.wav");
  assert.equal(audio.size, 4);
});

test("bounded multipart reader rejects a declared body that exceeds the byte budget", async () => {
  const request = new Request("http://copy-singer.test/upload", {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data; boundary=audit",
      "Content-Length": "4096",
    },
    body: "--audit--\r\n",
  });

  await assert.rejects(
    () => readBoundedMultipartFormData(request, 1024),
    (error: unknown) => error instanceof MultipartBodyTooLargeError,
  );
});

test("bounded multipart reader stops a chunked body after the byte budget", async () => {
  const form = new FormData();
  form.append("audio", new File([new Uint8Array(4096)], "large.wav", { type: "audio/wav" }));
  const request = new Request("http://copy-singer.test/upload", { method: "POST", body: form });

  await assert.rejects(
    () => readBoundedMultipartFormData(request, 1024),
    (error: unknown) => error instanceof MultipartBodyTooLargeError,
  );
});
