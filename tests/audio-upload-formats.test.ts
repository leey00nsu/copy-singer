import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedAudioUploadMimeType,
  normalizeAudioUploadMimeType,
  SUPPORTED_AUDIO_UPLOAD_ACCEPT,
  SUPPORTED_AUDIO_UPLOAD_EXTENSIONS,
  SUPPORTED_AUDIO_UPLOAD_FORMAT_LABEL,
  SUPPORTED_AUDIO_UPLOAD_MIME_TYPES,
} from "../src/shared/lib/audio";

const expectedAccept =
  ".wav,.mp3,.m4a,.webm,audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/aac,audio/x-m4a,audio/webm";

test("analysis and catalog share the same four visible audio extensions", () => {
  assert.deepEqual(SUPPORTED_AUDIO_UPLOAD_EXTENSIONS, [".wav", ".mp3", ".m4a", ".webm"]);
  assert.equal(SUPPORTED_AUDIO_UPLOAD_FORMAT_LABEL, "WAV · MP3 · M4A · WEBM");
  assert.equal(SUPPORTED_AUDIO_UPLOAD_ACCEPT, expectedAccept);
  assert.equal(SUPPORTED_AUDIO_UPLOAD_ACCEPT.includes("flac"), false);
  assert.equal(SUPPORTED_AUDIO_UPLOAD_ACCEPT.includes("audio/*"), false);
});

test("m4a MIME variants are supported while FLAC and unrelated audio are rejected", () => {
  for (const mimeType of ["audio/mp4", "audio/aac", "audio/x-m4a"]) {
    assert.equal(isSupportedAudioUploadMimeType(mimeType), true);
  }
  assert.equal(isSupportedAudioUploadMimeType("audio/webm;codecs=opus"), true);
  assert.equal(normalizeAudioUploadMimeType(" Audio/MP4; codecs=mp4a.40.2 "), "audio/mp4");
  assert.equal(isSupportedAudioUploadMimeType("audio/flac"), false);
  assert.equal(isSupportedAudioUploadMimeType("audio/ogg"), false);
  assert.deepEqual(
    [...SUPPORTED_AUDIO_UPLOAD_MIME_TYPES],
    ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/aac", "audio/x-m4a", "audio/webm"],
  );
});
