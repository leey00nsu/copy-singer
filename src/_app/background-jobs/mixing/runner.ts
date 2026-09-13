import "server-only";

import { mixingWorkerConcurrency } from "@/shared/config/index.server";
import { prisma } from "@/shared/db/index.server";
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
    let errors = 0;
    while (!stopping) {
      try {
        const processed = await runMixingWorkerOnce(owner);
        if (!processed) await sleep(1_000);
        errors = 0;
      } catch {
        errors += 1;
        console.error(
          JSON.stringify({
            event: "worker_iteration_failed",
            worker: "mixing",
            retryInMs: Math.min(30_000, 1000 * 2 ** Math.min(errors - 1, 5)),
          }),
        );
        if (!stopping) await sleep(Math.min(30_000, 1000 * 2 ** Math.min(errors - 1, 5)));
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: mixingWorkerConcurrency() }, (_, index) => runLane(index)));
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    await prisma.$disconnect();
  }
}
