import "server-only";

import { vocalProfileAnalysisWorkerConcurrency } from "@/shared/config/index.server";
import { runVocalProfileAnalysisWorkerOnce } from "./worker";

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function runVocalProfileAnalysisWorker() {
  let stopping = false;
  const stop = () => {
    stopping = true;
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  async function runLane(index: number) {
    const owner = `${process.pid}:vocal-profile:${index}:${crypto.randomUUID()}`;
    while (!stopping) {
      const processed = await runVocalProfileAnalysisWorkerOnce(owner);
      if (!processed) await sleep(1_000);
    }
  }

  await Promise.all(Array.from({ length: vocalProfileAnalysisWorkerConcurrency() }, (_, index) => runLane(index)));
}
