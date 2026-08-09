import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { runMixingWorker } = await import("../src/_app/background-jobs/mixing/index.server");

await runMixingWorker();
