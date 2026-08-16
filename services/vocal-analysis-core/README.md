# Vocal Analysis Core

`vocal_analysis_core` is the runtime-neutral librosa/pYIN analysis package shared by the two authenticated Modal CPU services.

- `services/vocal-profile-modal` packages it for user vocal-profile analysis and smart-reference generation.
- `services/song-catalog-analyzer` packages it for separated-vocal range analysis.
- It does not expose an HTTP server, persist recordings or provide a local analyzer runtime.

## Tests

```bash
python -m pip install -r services/vocal-analysis-core/requirements-dev.txt
python -m pytest -q services/vocal-analysis-core/tests
```

The Modal images pin their own runtime dependencies. Keep their librosa, NumPy and SoundFile versions aligned with `requirements.txt` when changing the analysis contract.
