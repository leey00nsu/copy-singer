import "server-only";

import { mixingWorkerConcurrency } from "@/shared/config/index.server";
import { runMixingWorkerOnce } from "./worker";

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function runMixingWorker() {
  let stopping = false;
  const stop = () => {
    stopping = true;
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  async function runLane(index: number) {
    const owner = `${process.pid}:${index}:${crypto.randomUUID()}`;
    while (!stopping) {
      const processed = await runMixingWorkerOnce(owner);
      if (!processed) await sleep(1_000);
    }
  }

  await Promise.all(Array.from({ length: mixingWorkerConcurrency() }, (_, index) => runLane(index)));
}
