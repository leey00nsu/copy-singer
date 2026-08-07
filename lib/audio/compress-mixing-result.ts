import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type CompressedMixingAudio = { bytes: Uint8Array; mimeType: "audio/mp4"; extension: "m4a" };

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg audio compression failed (${code}): ${stderr.slice(-800)}`)));
  });
}

export async function compressMixingResult(bytes: Uint8Array): Promise<CompressedMixingAudio> {
  const directory = await mkdtemp(join(tmpdir(), "copy-singer-mix-"));
  const input = join(directory, "input.audio");
  const output = join(directory, "output.m4a");
  try {
    await writeFile(input, bytes);
    await run(process.env.FFMPEG_BIN || "ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", input,
      "-vn", "-map_metadata", "-1", "-ac", "2", "-ar", "44100",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", output,
    ]);
    return { bytes: new Uint8Array(await readFile(output)), mimeType: "audio/mp4", extension: "m4a" };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
