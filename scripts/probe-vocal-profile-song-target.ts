import { performance } from "node:perf_hooks";
import { config } from "dotenv";
import artifactJson from "../data/catalogs/tj-2607-song-profiles.json";

config({ path: [".env.local", ".env"], quiet: true });

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  const rawOrder = process.argv.slice(2).find((value) => value !== "--") ?? "89";
  const catalogOrder = Number(rawOrder);
  if (!Number.isInteger(catalogOrder) || catalogOrder < 1) {
    throw new Error("Catalog order must be a positive integer.");
  }
  const song = artifactJson.songs.find((entry) => entry.catalogOrder === catalogOrder);
  if (!song) throw new Error(`Catalog order ${catalogOrder} was not found.`);

  const baseUrl = requiredEnv("VOCAL_PROFILE_MODAL_URL").replace(/\/$/, "");
  const apiKey = process.env.VOCAL_PROFILE_MODAL_API_KEY?.trim() || requiredEnv("MODAL_API_KEY");
  const headers = { "X-API-Key": apiKey };

  const healthResponse = await fetch(`${baseUrl}/health`, { headers, signal: AbortSignal.timeout(30_000) });
  if (!healthResponse.ok) throw new Error(`Health probe failed (${healthResponse.status}).`);
  const health = await healthResponse.json() as { capabilities?: string[] };
  if (!health.capabilities?.includes("song-target-v1")) {
    throw new Error("Deployed analyzer does not advertise song-target-v1.");
  }

  const started = performance.now();
  const response = await fetch(`${baseUrl}/v1/song-target`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl: song.sourceUrl, expectedVideoId: song.sourceVideoId }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1_000);
    throw new Error(`Song target probe failed (${response.status}): ${detail}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const riff = new TextDecoder("ascii").decode(bytes.slice(0, 4));
  if (riff !== "RIFF" || bytes.byteLength < 44) throw new Error("Song target response is not a valid WAV payload.");

  console.log(JSON.stringify({
    status: "ok",
    catalogOrder: song.catalogOrder,
    title: song.title,
    artist: song.artist,
    sourceVideoId: song.sourceVideoId,
    endpoint: `${baseUrl}/v1/song-target`,
    capabilities: health.capabilities,
    contentType: response.headers.get("content-type"),
    sizeBytes: bytes.byteLength,
    wavMagic: riff,
    wallSeconds: Number(((performance.now() - started) / 1000).toFixed(3)),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
