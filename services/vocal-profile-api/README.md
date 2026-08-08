# Local vocal profile analyzer

This service standardizes audio with ffmpeg and computes aggregate pitch and quality metrics with librosa pYIN. Its `app` package is the shared analysis core used by both the local FastAPI adapter and `services/vocal-profile-modal`. The FastAPI process in this directory is intended for local Docker Compose development/regression use and does not connect to PostgreSQL directly.

The local-only song catalog endpoint validates a catalog YouTube watch URL, runs yt-dlp, Demucs two-stem separation, and pYIN analysis inside an OS temporary directory, then deletes the source and every stem before returning aggregate metrics. No catalog audio directory or volume is mounted.

```bash
docker compose up -d --build postgres vocal-profile-api
curl -fsS http://localhost:8001/health
docker compose run --rm --no-deps \
  -v "$PWD/services/vocal-profile-api:/app" \
  vocal-profile-api sh -lc \
  'python -m pip install --disable-pip-version-check -q -r requirements-dev.txt && pytest -q'
```

`POST /v1/analyze` accepts one multipart `audio` field (WAV, MP3, M4A, or WebM), up to 25 MB and 60 seconds. Guided recordings may also include `preset`, `melody_start_ms`, `melody_end_ms`, `glissando_start_ms`, and `glissando_end_ms`. The local adapter retains source/reference artifacts temporarily for the follow-up GET endpoints, and `DELETE /v1/recordings/{id}` removes them.

For a deployed user-profile backend, F010 provides `services/vocal-profile-modal`, which runs the same shared core in a CPU-only Modal Web Function and returns profile + source/reference bytes in one ephemeral response. Production backend selection is explicit through `VOCAL_PROFILE_ANALYZER_BACKEND`; a Modal failure does not silently fall back to this local service.

The service returns aggregate MIDI range, tessitura, voiced ratio, pitch stability, clipping ratio, and RMS level. It does not diagnose vocal health or ability.

The first song job downloads the pinned Demucs model into the `demucs_models` Docker volume. That volume contains model weights only, never song audio.
