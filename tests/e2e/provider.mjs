import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:http";
export function wav() {
  const rate = 16000,
    samples = rate * 7;
  const b = Buffer.alloc(44 + samples * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    b.writeInt16LE(Math.round(Math.sin((i * 2 * Math.PI * 220) / rate) * 8000), 44 + i * 2);
  return b;
}
export async function startProvider() {
  const reservations = new Set();
  const files = new Map(),
    jobs = new Map();
  const stats = { analyses: 0, conversions: 0, deletes: 0 };
  let holdMixing = false,
    failMixing = false,
    failTarget = false;
  let failAnalysis = false,
    origin;
  const artifact = (bytes, mimeType = "audio/wav") => ({
    fileName: mimeType === "audio/wav" ? "fixture.wav" : "fixture.webm",
    mimeType,
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    contentBase64: bytes.toString("base64"),
  });
  const server = createServer(async (req, res) => {
    const json = (value, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    try {
      const url = new URL(req.url, origin),
        chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (url.pathname === "/control" && req.method === "POST") {
        const control = JSON.parse(body);
        failAnalysis = control.failAnalysis === true;
        holdMixing = control.holdMixing === true;
        failMixing = control.failMixing === true;
        failTarget = control.failTarget === true;
        return json({ ok: true });
      }
      if (url.pathname === "/stats") return json(stats);
      if (url.pathname.endsWith("/presign")) {
        const id = randomUUID();
        reservations.add(id);
        return json({ fileId: id, objectName: id, presignedUrl: `${origin}/files/${id}` });
      }
      if (url.pathname.endsWith("/confirm")) {
        const data = JSON.parse(body);
        if (!reservations.has(data.fileId)) return json({ error: "Unknown reservation" }, 404);
        if (!files.has(data.fileId)) return json({ error: "Upload not completed" }, 409);
        return json({ file: { id: data.fileId, url: `${origin}/files/${data.fileId}` } });
      }
      if (req.method === "PUT") {
        const id = url.pathname.split("/").at(-1);
        if (!url.pathname.startsWith("/files/") || !reservations.has(id))
          return json({ error: "Unknown reservation" }, 404);
        if (!body.length) return json({ error: "Empty upload" }, 400);
        files.set(id, { bytes: body, mimeType: req.headers["content-type"] });
        res.writeHead(200);
        return res.end();
      }
      if (req.method === "DELETE") {
        stats.deletes++;
        const id = url.pathname.split("/").at(-1);
        files.delete(id);
        reservations.delete(id);
        jobs.delete(id);
        res.writeHead(204);
        return res.end();
      }
      if (url.pathname === "/v1/analyze") {
        stats.analyses++;
        if (failAnalysis)
          return json({ reasonCode: "AUDIO_TOO_QUIET", detail: "Audio is too quiet.", retryable: false }, 422);
        const request = new Request(origin, { method: "POST", headers: req.headers, body });
        const form = await request.formData();
        const audio = form.get("audio");
        const bytes = Buffer.from(await audio.arrayBuffer()),
          synthesis = wav();
        const reference = {
          mimeType: "audio/wav",
          sizeBytes: synthesis.length,
          durationMs: 7000,
          algorithm: "voiced-phrase-band-selection",
          version: "smart-reference-mid-v1",
          sourceRanges: [{ band: "mid", startMs: 0, endMs: 7000 }],
          bandSeconds: { mid: 7 },
          voicedDensity: 0.9,
          pitchCoverageSemitones: 12,
          crossfadeMs: 30,
          fallbackReason: null,
        };
        return json({
          transportVersion: "modal-analysis-envelope-v1",
          cleanupConfirmed: true,
          profile: {
            recordingId: req.headers["x-recording-id"],
            mimeType: audio.type,
            sizeBytes: bytes.length,
            durationMs: 7000,
            sampleRate: 16000,
            minMidi: 48,
            maxMidi: 76,
            p10Midi: 52,
            medianMidi: 62,
            p90Midi: 72,
            tessituraLowMidi: 54,
            tessituraHighMidi: 70,
            voicedRatio: 0.9,
            pitchStability: 0.8,
            clippingRatio: 0,
            rmsDb: -18,
            analyzer: "librosa-pyin",
            analyzerVersion: "0.11.0",
            descriptors: { synthesisReference: reference },
            synthesisReference: reference,
          },
          artifacts: { source: artifact(bytes, audio.type), synthesisReference: artifact(synthesis) },
        });
      }
      if (url.pathname === "/v1/conversions" && req.method === "POST") {
        stats.conversions++;
        const id = randomUUID();
        jobs.set(id, true);
        return json({ id, status: "queued" });
      }
      if (/\/v1\/conversions\/[^/]+$/.test(url.pathname)) {
        const id = url.pathname.split("/").at(-1);
        return jobs.has(id)
          ? json({
              id,
              status: holdMixing ? "processing" : failMixing ? "failed" : "succeeded",
              error: failMixing ? "E2E synthesis failed" : null,
            })
          : json({ error: "Not found" }, 404);
      }
      if (url.pathname.startsWith("/files/") || url.pathname.endsWith("/audio") || url.pathname === "/catalog.wav") {
        if (url.pathname === "/catalog.wav" && failTarget) return json({ error: "Invalid target" }, 422);
        const file = files.get(url.pathname.split("/").at(-1));
        if (url.pathname.startsWith("/files/") && !file) return json({ error: "Not found" }, 404);
        const bytes = file?.bytes ?? wav();
        const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? "");
        const start = match ? Number(match[1]) : 0,
          end = match ? Math.min(Number(match[2] || bytes.length - 1), bytes.length - 1) : bytes.length - 1;
        res.writeHead(match ? 206 : 200, {
          "Content-Type": file?.mimeType ?? "audio/wav",
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          ...(match ? { "Content-Range": `bytes ${start}-${end}/${bytes.length}` } : {}),
        });
        return res.end(bytes.subarray(start, end + 1));
      }
      json({ error: "Unexpected test-provider request", path: url.pathname }, 404);
    } catch (e) {
      console.error("fixture provider:", e.message);
      json({ error: "Fixture failure" }, 500);
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, stats, close: () => new Promise((resolve) => server.close(resolve)) };
}
