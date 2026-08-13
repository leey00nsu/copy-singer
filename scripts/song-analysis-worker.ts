import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const { runSongAnalysisWorker } = await import("../src/_app/background-jobs/song-analysis/index.server");
await runSongAnalysisWorker();
