import { performance } from "node:perf_hooks";
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const DEFAULT_DURATIONS = [10, 30, 60];
const DEFAULT_COLD_WAIT_SECONDS = 65;
const SAMPLE_RATE = 16_000;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function numberEnv(name: string) {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a non-negative number.`);
  return value;
}

function parseDurations() {
  const raw = process.argv.slice(2).find((value) => value !== "--")?.trim();
  if (!raw) return DEFAULT_DURATIONS;
  const durations = raw.split(",").map((value) => Number(value));
  if (durations.some((value) => !Number.isFinite(value) || value <= 0 || value > 60)) {
    throw new Error("Duration argument must be comma-separated seconds between 0 and 60.");
  }
  return durations;
}

function makeFixtureWav(durationSeconds: number) {
  const sampleCount = Math.round(SAMPLE_RATE * durationSeconds);
  const dataBytes = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataBytes, 40);

  const frequencies = [196.0, 220.0, 261.63];
  for (let index = 0; index < sampleCount; index += 1) {
    const band = Math.min(2, Math.floor((index * 3) / sampleCount));
    const sample = Math.sin((2 * Math.PI * frequencies[band] * index) / SAMPLE_RATE) * 0.25;
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }
  return buffer;
}

function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function requestAnalysis(input: {
  baseUrl: string;
  apiKey: string;
  durationSeconds: number;
  label: "cold-candidate" | "warm";
}) {
  const wav = makeFixtureWav(input.durationSeconds);
  const form = new FormData();
  form.append("audio", new Blob([wav], { type: "audio/wav" }), `benchmark-${input.durationSeconds}s.wav`);
  const started = performance.now();
  const response = await fetch(`${input.baseUrl}/v1/analyze`, {
    method: "POST",
    headers: {
      "X-Recording-ID": crypto.randomUUID(),
      "X-API-Key": input.apiKey,
    },
    body: form,
  });
  const responseText = await response.text();
  const wallSeconds = (performance.now() - started) / 1000;
  if (!response.ok) {
    throw new Error(`${input.durationSeconds}s ${input.label} failed (${response.status}): ${responseText.slice(0, 500)}`);
  }
  const payload = JSON.parse(responseText) as {
    cleanupConfirmed?: boolean;
    containerInstanceId?: string;
    containerStartedAtMs?: number;
    profile?: { durationMs?: number; analyzer?: string; analyzerVersion?: string; synthesisReference?: { durationMs?: number } | null };
    artifacts?: { source?: { sizeBytes?: number }; synthesisReference?: { sizeBytes?: number } | null };
    compute?: { cpuPhysicalCores?: number; memoryMiB?: number; gpu?: boolean };
    metrics?: { uploadBytes?: number; analysisSeconds?: number; serializationSeconds?: number; handlerSeconds?: number };
  };
  if (payload.cleanupConfirmed !== true) throw new Error("Modal analyzer did not confirm cleanup.");
  return {
    durationSeconds: input.durationSeconds,
    label: input.label,
    wallSeconds: Number(wallSeconds.toFixed(3)),
    responseBytes: Buffer.byteLength(responseText),
    containerInstanceId: payload.containerInstanceId ?? null,
    containerStartedAtMs: payload.containerStartedAtMs ?? null,
    profileDurationMs: payload.profile?.durationMs ?? null,
    analyzer: payload.profile?.analyzer ?? null,
    analyzerVersion: payload.profile?.analyzerVersion ?? null,
    synthesisDurationMs: payload.profile?.synthesisReference?.durationMs ?? null,
    sourceArtifactBytes: payload.artifacts?.source?.sizeBytes ?? null,
    synthesisArtifactBytes: payload.artifacts?.synthesisReference?.sizeBytes ?? null,
    compute: payload.compute ?? null,
    metrics: payload.metrics ?? null,
  };
}

async function main() {
  const baseUrl = requiredEnv("VOCAL_PROFILE_MODAL_URL").replace(/\/$/, "");
  const apiKey = process.env.VOCAL_PROFILE_MODAL_API_KEY?.trim() || requiredEnv("MODAL_API_KEY");
  const durations = parseDurations();
  const coldWaitSeconds = Number(process.env.MODAL_BENCHMARK_COLD_WAIT_SECONDS ?? DEFAULT_COLD_WAIT_SECONDS);
  if (!Number.isFinite(coldWaitSeconds) || coldWaitSeconds < 0) {
    throw new Error("MODAL_BENCHMARK_COLD_WAIT_SECONDS must be non-negative.");
  }

  const wrongCredential = await fetch(`${baseUrl}/health`, {
    headers: { "X-API-Key": "invalid-benchmark-key" },
  });
  if (wrongCredential.status !== 401 && wrongCredential.status !== 403) {
    throw new Error(`Wrong credential probe expected 401/403, got ${wrongCredential.status}.`);
  }

  const results = [];
  for (let index = 0; index < durations.length; index += 1) {
    if (index > 0 && coldWaitSeconds > 0) await sleep(coldWaitSeconds);
    const durationSeconds = durations[index];
    const cold = await requestAnalysis({ baseUrl, apiKey, durationSeconds, label: "cold-candidate" });
    const warm = await requestAnalysis({ baseUrl, apiKey, durationSeconds, label: "warm" });
    results.push({
      durationSeconds,
      cooledForSeconds: index === 0 ? null : coldWaitSeconds,
      cold,
      warm,
      warmReusedContainer: Boolean(
        cold.containerInstanceId
        && warm.containerInstanceId
        && cold.containerInstanceId === warm.containerInstanceId,
      ),
    });
  }

  const healthResponse = await fetch(`${baseUrl}/health`, {
    headers: { "X-API-Key": apiKey },
  });
  if (!healthResponse.ok) throw new Error(`Authenticated health failed (${healthResponse.status}).`);
  const health = await healthResponse.json();

  const cpuRate = numberEnv("MODAL_BENCHMARK_CPU_USD_PER_CORE_SECOND");
  const memoryRate = numberEnv("MODAL_BENCHMARK_MEMORY_USD_PER_GIB_SECOND");
  const estimated = cpuRate !== null && memoryRate !== null
    ? results.flatMap((entry) => [entry.cold, entry.warm]).map((sample) => {
        const cpu = sample.compute?.cpuPhysicalCores ?? 0;
        const memoryGiB = (sample.compute?.memoryMiB ?? 0) / 1024;
        const usdPerSecond = cpu * cpuRate + memoryGiB * memoryRate;
        return {
          durationSeconds: sample.durationSeconds,
          label: sample.label,
          handlerEstimatedUsd: sample.metrics?.handlerSeconds === undefined
            ? null
            : Number((sample.metrics.handlerSeconds * usdPerSecond).toFixed(6)),
          wallUpperBoundUsd: Number((sample.wallSeconds * usdPerSecond).toFixed(6)),
        };
      })
    : null;

  console.log(JSON.stringify({
    status: "ok",
    generatedAt: new Date().toISOString(),
    endpoint: baseUrl,
    wrongCredentialStatus: wrongCredential.status,
    coldWaitSeconds,
    health,
    pricingInputs: {
      cpuUsdPerCoreSecond: cpuRate,
      memoryUsdPerGiBSecond: memoryRate,
    },
    estimates: estimated,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
