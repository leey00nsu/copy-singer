import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { vocalProfileAnalysisWorkerConcurrency } = await import("../src/shared/config/index.server");
const { runVocalProfileAnalysisWorkerOnce } = await import(
  "../src/_app/background-jobs/vocal-profile-analysis/index.server"
);

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function runLane(index: number) {
  const owner = `${process.pid}:vocal-profile:${index}:${crypto.randomUUID()}`;
  while (!stopping) {
    const processed = await runVocalProfileAnalysisWorkerOnce(owner);
    if (!processed) await sleep(1_000);
  }
}

await Promise.all(Array.from({ length: vocalProfileAnalysisWorkerConcurrency() }, (_, index) => runLane(index)));
