import "server-only";

import { songAnalysisWorkerConcurrency } from "@/shared/config/index.server";
import { runSongAnalysisWorkerOnce } from "./worker";

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export async function runSongAnalysisWorker() {
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  async function runLane(index: number) {
    const owner = `${process.pid}:song-analysis:${index}:${crypto.randomUUID()}`;
    while (!stopping) {
      if (!(await runSongAnalysisWorkerOnce(owner))) await sleep(1_000);
    }
  }
  await Promise.all(Array.from({ length: songAnalysisWorkerConcurrency() }, (_, index) => runLane(index)));
}
