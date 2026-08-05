#!/usr/bin/env python3
"""Generate deterministic human-hum guide assets from local OmniVoice."""

from __future__ import annotations

import argparse
import json
import math
import urllib.request
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

SAMPLE_RATE = 24_000
NOTE_SECONDS = 0.75
PATTERN = (0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 9, 7, 4, 2, 0)
PRESETS = {
    "low": {"start_midi": 48, "instruct": "female, korean accent, low pitch"},
    "medium": {"start_midi": 55, "instruct": "female, korean accent, moderate pitch"},
    "high": {"start_midi": 60, "instruct": "female, korean accent, very high pitch"},
}


def synthesize_seed(endpoint: str, voice: str, instruct: str, seed: int) -> bytes:
    body = json.dumps(
        {
            "model": "omnivoice",
            "input": "음————————",
            "voice": voice,
            "response_format": "wav",
            "speed": 0.5,
            "language": "ko",
            "instruct": instruct,
            "duration": 2.0,
            "seed": seed,
            "denoise": True,
            "preprocess_prompt": True,
            "num_step": 32,
            "guidance_scale": 2.0,
        },
        ensure_ascii=False,
    ).encode()
    request = urllib.request.Request(
        f"{endpoint.rstrip('/')}/v1/audio/speech",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        if response.headers.get_content_type() not in {"audio/wav", "audio/x-wav"}:
            raise RuntimeError(f"Expected WAV response, got {response.headers.get_content_type()}")
        return response.read()


def pitch_track(audio: np.ndarray) -> np.ndarray:
    f0, _, _ = librosa.pyin(
        audio,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=SAMPLE_RATE,
        frame_length=2048,
        hop_length=256,
    )
    return librosa.hz_to_midi(f0)


def stable_hum(audio: np.ndarray) -> tuple[np.ndarray, float, dict[str, float]]:
    midi = pitch_track(audio)
    window_frames = max(8, round(0.45 * SAMPLE_RATE / 256))
    best: tuple[float, int, float] | None = None
    for start in range(0, max(1, len(midi) - window_frames + 1)):
        values = midi[start : start + window_frames]
        voiced = values[np.isfinite(values)]
        if len(voiced) < window_frames * 0.55:
            continue
        spread = float(np.percentile(voiced, 90) - np.percentile(voiced, 10))
        score = spread + (1 - len(voiced) / window_frames) * 4
        candidate = (score, start, float(np.median(voiced)))
        if best is None or candidate < best:
            best = candidate
    if best is None or best[0] > 1.5:
        raise RuntimeError("OmniVoice seed did not contain a stable voiced region")

    _, start_frame, source_midi = best
    start_sample = start_frame * 256
    length = min(len(audio) - start_sample, round(0.62 * SAMPLE_RATE))
    segment = audio[start_sample : start_sample + length]
    fade = min(round(0.03 * SAMPLE_RATE), len(segment) // 4)
    envelope = np.ones(len(segment), dtype=np.float32)
    envelope[:fade] = np.linspace(0, 1, fade, dtype=np.float32)
    envelope[-fade:] = np.linspace(1, 0, fade, dtype=np.float32)
    segment = segment * envelope
    return segment, source_midi, {
        "source_midi": round(source_midi, 3),
        "stable_spread_semitones": round(best[0], 3),
        "source_duration_seconds": round(len(audio) / SAMPLE_RATE, 3),
    }


def fit_note(audio: np.ndarray, target_samples: int) -> np.ndarray:
    if len(audio) >= target_samples:
        return audio[:target_samples]
    repeats = math.ceil(target_samples / len(audio))
    return np.tile(audio, repeats)[:target_samples]


def make_guide(seed: np.ndarray, source_midi: float, start_midi: int) -> np.ndarray:
    note_samples = round(NOTE_SECONDS * SAMPLE_RATE)
    guide = np.zeros(note_samples * len(PATTERN), dtype=np.float32)
    for index, interval in enumerate(PATTERN):
        target_midi = start_midi + interval
        shifted = librosa.effects.pitch_shift(
            seed,
            sr=SAMPLE_RATE,
            n_steps=target_midi - source_midi,
            bins_per_octave=12,
            res_type="soxr_hq",
        )
        hum = fit_note(shifted, note_samples)
        time = np.arange(note_samples, dtype=np.float32) / SAMPLE_RATE
        sine = np.sin(2 * np.pi * librosa.midi_to_hz(target_midi) * time).astype(np.float32)
        attack = round(0.035 * SAMPLE_RATE)
        release = round(0.055 * SAMPLE_RATE)
        envelope = np.ones(note_samples, dtype=np.float32)
        envelope[:attack] = np.linspace(0, 1, attack, dtype=np.float32)
        envelope[-release:] = np.linspace(1, 0, release, dtype=np.float32)
        note = (hum * 0.8 + sine * 0.2) * envelope
        start = index * note_samples
        guide[start : start + note_samples] = note

    peak = float(np.max(np.abs(guide)))
    if peak > 0:
        guide *= 10 ** (-1 / 20) / peak
    return guide


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", default="http://host.docker.internal:3900")
    parser.add_argument("--voice", default="c0aaab4f")
    parser.add_argument("--output", default="/workspace/public/audio/guides")
    args = parser.parse_args()
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, object] = {
        "generator": "OmniVoice Studio API 0.4.2 + librosa pitch correction",
        "voice": args.voice,
        "seed_candidates": [42, 43, 44, 45, 46],
        "mix": {"humming": 0.8, "sine": 0.2},
        "sample_rate": SAMPLE_RATE,
        "note_duration_ms": round(NOTE_SECONDS * 1000),
        "presets": {},
    }

    for name, config in PRESETS.items():
        seed_path = output / f".{name}-seed.wav"
        stable = None
        last_error: Exception | None = None
        seed_used = 42
        for seed_used in [42, 43, 44, 45, 46]:
            seed_path.write_bytes(synthesize_seed(args.endpoint, args.voice, str(config["instruct"]), seed_used))
            audio, _ = librosa.load(seed_path, sr=SAMPLE_RATE, mono=True)
            try:
                stable_audio, source_midi, metrics = stable_hum(audio)
                stable = (stable_audio, source_midi, metrics)
                break
            except RuntimeError as error:
                last_error = error
                print(f"retrying {name}: seed {seed_used} was not stably voiced")
        if stable is None:
            seed_path.unlink(missing_ok=True)
            raise RuntimeError(f"OmniVoice did not create a usable {name} humming seed") from last_error
        stable_audio, source_midi, metrics = stable
        guide = make_guide(stable_audio, source_midi, int(config["start_midi"]))
        asset_path = output / f"humming-{name}.wav"
        sf.write(asset_path, guide, SAMPLE_RATE, subtype="PCM_16")
        seed_path.unlink()
        measured = pitch_track(guide)
        voiced = measured[np.isfinite(measured)]
        manifest["presets"][name] = {
            **metrics,
            "seed": seed_used,
            "asset": f"/audio/guides/{asset_path.name}",
            "duration_seconds": round(len(guide) / SAMPLE_RATE, 3),
            "measured_min_midi": round(float(np.percentile(voiced, 2)), 3),
            "measured_max_midi": round(float(np.percentile(voiced, 98)), 3),
        }
        print(f"generated {name}: {asset_path} ({source_midi:.2f} MIDI seed)")

    (output / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
