import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { runVocalProfileAnalysisWorker } = await import(
  "../src/_app/background-jobs/vocal-profile-analysis/index.server"
);

await runVocalProfileAnalysisWorker();
