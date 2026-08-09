import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { mixingWorkerConcurrency } = await import("../src/shared/config/index.server");
const { runMixingWorkerOnce } = await import("../src/_app/background-jobs/mixing/index.server");

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
  const owner = `${process.pid}:${index}:${crypto.randomUUID()}`;
  while (!stopping) {
    const processed = await runMixingWorkerOnce(owner);
    if (!processed) await sleep(1_000);
  }
}

await Promise.all(Array.from({ length: mixingWorkerConcurrency() }, (_, index) => runLane(index)));
