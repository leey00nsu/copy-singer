import hmac
import os
import shutil
import tempfile
import time
import uuid
from pathlib import Path

import modal


APP_NAME = "soulx-singer-svc"
UPSTREAM_COMMIT = "81aeb3ae772c70093c3de74dc23c92d983801ae4"
SOULX_MODEL_REVISION = "40493ad90286056c7a9095035164434a79daa8c9"
PREPROCESS_MODEL_REVISION = "83dc50289d22a81b1e9998f5b9e111aef7c1fdcd"

MODEL_MOUNT = Path("/models")
JOB_MOUNT = Path("/jobs")
SOULX_ROOT = Path("/opt/SoulX-Singer")

GPU_TYPE = os.getenv("SOULX_GPU", "L4")
MAX_CONTAINERS = int(os.getenv("SOULX_MAX_CONTAINERS", "1"))
SCALEDOWN_WINDOW = int(os.getenv("SOULX_SCALEDOWN_WINDOW", "60"))
PROMPT_MAX_UPLOAD_BYTES = 128 * 1024 * 1024
TARGET_MAX_UPLOAD_BYTES = 256 * 1024 * 1024
JOB_TTL_SECONDS = 24 * 60 * 60

app = modal.App(APP_NAME)
model_volume = modal.Volume.from_name("soulx-singer-models", create_if_missing=True)
job_volume = modal.Volume.from_name("soulx-singer-jobs", create_if_missing=True)
job_store = modal.Dict.from_name("soulx-singer-job-index", create_if_missing=True)
api_secret = modal.Secret.from_name("soulx-api-secret")

base_image = modal.Image.debian_slim(python_version="3.10").apt_install(
    "ffmpeg", "git", "libsndfile1"
)

download_image = base_image.pip_install("huggingface_hub>=0.20.0")

gpu_image = (
    base_image.pip_install_from_requirements("requirements-soulx.txt")
    .run_commands(
        f"git clone https://github.com/Soul-AILab/SoulX-Singer.git {SOULX_ROOT}",
        f"git -C {SOULX_ROOT} checkout {UPSTREAM_COMMIT}",
    )
    .add_local_python_source("api")
)

web_image = base_image.pip_install(
    "fastapi==0.116.1",
    "python-multipart==0.0.20",
)


@app.function(image=download_image, volumes={MODEL_MOUNT: model_volume}, timeout=1800)
def download_models() -> dict:
    """Download only the weights required by the SVC API onto a persistent Volume."""
    from huggingface_hub import snapshot_download

    singer_dir = MODEL_MOUNT / "SoulX-Singer"
    preprocess_dir = MODEL_MOUNT / "SoulX-Singer-Preprocess"
    snapshot_download(
        repo_id="Soul-AILab/SoulX-Singer",
        revision=SOULX_MODEL_REVISION,
        allow_patterns=["model-svc.pt"],
        local_dir=singer_dir,
    )
    snapshot_download(
        repo_id="Soul-AILab/SoulX-Singer-Preprocess",
        revision=PREPROCESS_MODEL_REVISION,
        allow_patterns=["rmvpe/*", "mel-band-roformer-karaoke/*"],
        local_dir=preprocess_dir,
    )
    model_volume.commit()
    return {"status": "ready", "model_dir": str(MODEL_MOUNT)}


def _link_model_directories() -> None:
    pretrained = SOULX_ROOT / "pretrained_models"
    pretrained.mkdir(parents=True, exist_ok=True)
    for name in ("SoulX-Singer", "SoulX-Singer-Preprocess"):
        link = pretrained / name
        target = MODEL_MOUNT / name
        if not target.exists():
            raise RuntimeError("Model weights are missing. Run: modal run modal_app.py::setup")
        if link.is_symlink() or link.exists():
            if link.resolve() == target.resolve():
                continue
            if link.is_dir() and not link.is_symlink():
                shutil.rmtree(link)
            else:
                link.unlink()
        link.symlink_to(target, target_is_directory=True)


@app.cls(
    image=gpu_image,
    gpu=GPU_TYPE,
    volumes={MODEL_MOUNT: model_volume, JOB_MOUNT: job_volume},
    timeout=3600,
    max_containers=MAX_CONTAINERS,
    scaledown_window=SCALEDOWN_WINDOW,
)
class SoulXModel:
    @modal.enter()
    def load(self) -> None:
        from api.config import Settings
        from api.engine import SoulXEngine

        _link_model_directories()
        settings = Settings(
            api_key="",
            soulx_root=SOULX_ROOT,
            runtime_dir=Path("/tmp/soulx-runtime"),
            prompt_max_seconds=30,
            target_max_seconds=300,
            max_upload_bytes=TARGET_MAX_UPLOAD_BYTES,
            job_ttl_hours=24,
            queue_size=1,
            fp16=True,
        )
        self.engine = SoulXEngine(settings)

    @modal.method()
    def convert(self, job_id: str, params: dict) -> dict:
        job_volume.reload()
        remote_job_dir = JOB_MOUNT / job_id
        prompt_source = remote_job_dir / params["prompt_filename"]
        target_source = remote_job_dir / params["target_filename"]
        if not prompt_source.exists() or not target_source.exists():
            raise FileNotFoundError("Uploaded input audio is missing")

        with tempfile.TemporaryDirectory(prefix=f"soulx-{job_id}-") as temp_dir:
            work_dir = Path(temp_dir)
            prompt_local = work_dir / params["prompt_filename"]
            target_local = work_dir / params["target_filename"]
            shutil.copy2(prompt_source, prompt_local)
            shutil.copy2(target_source, target_local)
            output = self.engine.convert(
                prompt_input=prompt_local,
                target_input=target_local,
                work_dir=work_dir / "work",
                prompt_vocal_separation=params["prompt_vocal_separation"],
                target_vocal_separation=params["target_vocal_separation"],
                auto_pitch_shift=params["auto_pitch_shift"],
                auto_mix_accompaniment=params["auto_mix_accompaniment"],
                pitch_shift=params["pitch_shift"],
                steps=params["steps"],
                cfg=params["cfg"],
                seed=params["seed"],
            )
            result_path = remote_job_dir / "result.wav"
            shutil.copy2(output, result_path)

        job_volume.commit()
        return {
            "output_path": f"{job_id}/result.wav",
            "size": result_path.stat().st_size,
        }


def _safe_audio_filename(prefix: str, original: str | None) -> str:
    allowed = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".aac", ".webm", ".mp4"}
    suffix = Path(original or "").suffix.lower()
    return f"{prefix}{suffix if suffix in allowed else '.audio'}"


async def _save_upload(upload, destination: Path, max_bytes: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    try:
        with destination.open("wb") as output:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    from fastapi import HTTPException

                    max_mb = max_bytes // (1024 * 1024)
                    raise HTTPException(
                        status_code=413,
                        detail=f"{upload.filename or 'Uploaded file'} exceeds the {max_mb} MB limit",
                    )
                output.write(chunk)
    finally:
        await upload.close()


def _public_job(job_id: str, status: str, created_at: float, error: str | None = None) -> dict:
    return {
        "id": job_id,
        "status": status,
        "created_at": created_at,
        "error": error,
        "result_url": f"/v1/conversions/{job_id}/audio" if status == "succeeded" else None,
    }


@app.function(
    image=web_image,
    volumes={JOB_MOUNT: job_volume},
    secrets=[api_secret],
    timeout=300,
    max_containers=4,
)
@modal.concurrent(max_inputs=1)
@modal.asgi_app()
def web():
    from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
    from fastapi.responses import FileResponse

    web_app = FastAPI(title="SoulX-Singer SVC API", version="2.0.0")

    def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
        expected = os.environ.get("SOULX_API_KEY", "")
        if not expected:
            raise HTTPException(status_code=503, detail="SOULX_API_KEY is not configured")
        if x_api_key is None or not hmac.compare_digest(x_api_key, expected):
            raise HTTPException(status_code=401, detail="Invalid API key")

    async def get_job(job_id: str) -> dict:
        metadata = await job_store.get.aio(job_id)
        if metadata is None:
            raise HTTPException(status_code=404, detail="Conversion job not found")
        return metadata

    async def resolve_job(job_id: str) -> tuple[dict, dict | None]:
        metadata = await get_job(job_id)
        if metadata.get("status") == "succeeded":
            return metadata, metadata.get("result")
        if metadata.get("status") == "failed":
            return metadata, None

        call = modal.FunctionCall.from_id(metadata["call_id"])
        try:
            result = await call.get.aio(timeout=0)
        except TimeoutError:
            metadata["status"] = "processing"
            return metadata, None
        except modal.exception.OutputExpiredError:
            raise HTTPException(status_code=410, detail="Conversion result expired")
        except Exception as exc:
            metadata["status"] = "failed"
            metadata["error"] = f"{type(exc).__name__}: {exc}"
            await job_store.put.aio(job_id, metadata)
            return metadata, None

        metadata["status"] = "succeeded"
        metadata["result"] = result
        await job_store.put.aio(job_id, metadata)
        return metadata, result

    @web_app.get("/health")
    async def health() -> dict:
        return {"status": "ok", "platform": "modal", "gpu": GPU_TYPE}

    @web_app.post("/v1/conversions", status_code=202, dependencies=[Depends(require_api_key)])
    async def create_conversion(
        prompt_audio: UploadFile = File(...),
        target_audio: UploadFile = File(...),
        prompt_vocal_separation: bool = Form(False),
        target_vocal_separation: bool = Form(True),
        auto_pitch_shift: bool = Form(True),
        auto_mix_accompaniment: bool = Form(True),
        pitch_shift: int = Form(0, ge=-36, le=36),
        steps: int = Form(32, ge=1, le=100),
        cfg: float = Form(1.0, ge=0.0, le=10.0),
        seed: int = Form(42, ge=0, le=2_147_483_647),
    ) -> dict:
        job_id = uuid.uuid4().hex
        job_dir = JOB_MOUNT / job_id
        prompt_filename = _safe_audio_filename("prompt", prompt_audio.filename)
        target_filename = _safe_audio_filename("target", target_audio.filename)
        try:
            await _save_upload(
                prompt_audio,
                job_dir / prompt_filename,
                PROMPT_MAX_UPLOAD_BYTES,
            )
            await _save_upload(
                target_audio,
                job_dir / target_filename,
                TARGET_MAX_UPLOAD_BYTES,
            )
            await job_volume.commit.aio()
        except Exception:
            shutil.rmtree(job_dir, ignore_errors=True)
            raise

        params = {
            "prompt_filename": prompt_filename,
            "target_filename": target_filename,
            "prompt_vocal_separation": prompt_vocal_separation,
            "target_vocal_separation": target_vocal_separation,
            "auto_pitch_shift": auto_pitch_shift,
            "auto_mix_accompaniment": auto_mix_accompaniment,
            "pitch_shift": pitch_shift,
            "steps": steps,
            "cfg": cfg,
            "seed": seed,
        }
        call = await SoulXModel().convert.spawn.aio(job_id, params)
        metadata = {
            "id": job_id,
            "call_id": call.object_id,
            "status": "queued",
            "created_at": time.time(),
            "error": None,
        }
        await job_store.put.aio(job_id, metadata)
        return _public_job(job_id, "queued", metadata["created_at"])

    @web_app.get("/v1/conversions/{job_id}", dependencies=[Depends(require_api_key)])
    async def conversion_status(job_id: str) -> dict:
        metadata, _ = await resolve_job(job_id)
        return _public_job(
            job_id,
            metadata["status"],
            metadata["created_at"],
            metadata.get("error"),
        )

    @web_app.get("/v1/conversions/{job_id}/audio", dependencies=[Depends(require_api_key)])
    async def conversion_audio(job_id: str):
        metadata, result = await resolve_job(job_id)
        if metadata["status"] != "succeeded" or result is None:
            raise HTTPException(status_code=409, detail=f"Conversion is {metadata['status']}")
        await job_volume.reload.aio()
        output = JOB_MOUNT / result["output_path"]
        if not output.exists():
            raise HTTPException(status_code=410, detail="Conversion audio expired")
        return FileResponse(output, media_type="audio/wav", filename=f"{job_id}.wav")

    @web_app.delete("/v1/conversions/{job_id}", status_code=204, dependencies=[Depends(require_api_key)])
    async def delete_conversion(job_id: str):
        metadata = await get_job(job_id)
        if metadata.get("status") not in {"succeeded", "failed"}:
            call = modal.FunctionCall.from_id(metadata["call_id"])
            await call.cancel.aio(terminate_containers=True)
        await job_volume.reload.aio()
        shutil.rmtree(JOB_MOUNT / job_id, ignore_errors=True)
        await job_volume.commit.aio()
        await job_store.pop.aio(job_id, None)

    return web_app


@app.function(
    image=web_image,
    volumes={JOB_MOUNT: job_volume},
    schedule=modal.Cron("17 3 * * *"),
    timeout=300,
)
def cleanup_expired_jobs() -> dict:
    """Delete input and result audio after 24 hours to limit retained user data."""
    job_volume.reload()
    cutoff = time.time() - JOB_TTL_SECONDS
    removed = 0
    if JOB_MOUNT.exists():
        for job_dir in JOB_MOUNT.iterdir():
            if job_dir.is_dir() and job_dir.stat().st_mtime < cutoff:
                shutil.rmtree(job_dir, ignore_errors=True)
                job_store.pop(job_dir.name, None)
                removed += 1
    if removed:
        job_volume.commit()
    return {"removed": removed}


@app.local_entrypoint()
def setup() -> None:
    result = download_models.remote()
    print(result)
