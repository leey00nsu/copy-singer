import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type CompressedMixingAudio = { bytes: Uint8Array; mimeType: "audio/mp4"; extension: "m4a" };

export const MIXING_FINALIZATION_VERSION = "clarity-normal-v1";

export const CLARITY_NORMAL_FILTER_CHAIN = [
  "highpass=f=25",
  "bass=f=95:t=q:w=0.7:g=-0.4",
  "equalizer=f=280:t=q:w=0.9:g=-1.4",
  "equalizer=f=3500:t=q:w=0.9:g=1.3",
  "treble=f=8500:t=q:w=0.6:g=1.7",
  "acompressor=threshold=0.2:ratio=1.5:attack=20:release=220:knee=2.8:link=maximum:detection=rms:mix=1",
  "extrastereo=m=1.05:c=false",
  "loudnorm=I=-14:LRA=11:TP=-1.0",
].join(",");

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => code === 0
      ? resolve()
      : reject(new Error(`FFmpeg mixing finalization failed (${code}): ${stderr.slice(-800)}`)));
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
      "-vn", "-af", CLARITY_NORMAL_FILTER_CHAIN,
      "-map_metadata", "-1", "-ac", "2", "-ar", "44100",
      "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", output,
    ]);
    return { bytes: new Uint8Array(await readFile(output)), mimeType: "audio/mp4", extension: "m4a" };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
