# Modal song catalog benchmark

This non-deployed Modal app analyzes pending catalog songs on up to eight independent L4 containers. It keeps the existing Demucs 4.0.1 and librosa-pYIN 0.11.0 profile contract. The default remains a three-song benchmark; larger limits should be used only after explicit cost approval.

```bash
python -m pip install -r requirements-local.txt
python -m modal setup
python -m modal run modal_app.py --limit 3
# Explicitly approved full pending batch example:
COPY_SINGER_TEMP_ROOT=/Volumes/sn850x/copy-singer-temp \
  python -m modal run modal_app.py --limit 86
```

The limit is restricted to 1–100 and defaults to 3. Set `COPY_SINGER_TEMP_ROOT` to place the job-scoped local temporary directory on a disk with sufficient space. YouTube downloads use four local workers; individual failures are recorded without stopping successful inputs. WAV files are copied to an anonymous `modal.Volume.ephemeral()` only for the duration of the run. GPU functions copy them to their own `/tmp`, delete source and stems on exit, and return aggregate metrics. The local entrypoint atomically updates `data/catalogs/tj-2607-song-profiles.json`. No endpoint is deployed and no named media Volume, Dict, or database row is created.
