export const MAX_PROFILE_AUDIO_SECONDS = 60;

export function isLongProfileAudio(durationSeconds: number) {
  return Number.isFinite(durationSeconds) && durationSeconds > MAX_PROFILE_AUDIO_SECONDS;
}

export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    const sourceUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(sourceUrl);
    };
    const finish = (duration?: number, error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      cleanup();
      if (duration !== undefined && Number.isFinite(duration)) resolve(duration);
      else reject(error ?? new Error("Audio duration is unavailable."));
    };
    const readDuration = () => {
      if (Number.isFinite(audio.duration)) finish(audio.duration);
    };
    const timeout = window.setTimeout(
      () => finish(undefined, new Error("Audio metadata timed out.")),
      10_000,
    );

    audio.preload = "metadata";
    audio.onloadedmetadata = readDuration;
    audio.ondurationchange = readDuration;
    audio.onerror = () => finish(undefined, new Error("Audio metadata could not be read."));
    audio.src = sourceUrl;
  });
}
