import ast
import asyncio
import hashlib
import json
import time
import shutil
import tempfile
import uuid
import sys
from unittest.mock import patch
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]

class FakeDict:
    def __init__(self):
        self.values = {}
        self.put = SimpleNamespace(aio=self._put)
        self.get = SimpleNamespace(aio=self._get)
    async def _put(self, key, value, skip_if_exists=False):
        if skip_if_exists and key in self.values:
            return False
        self.values[key] = value
        return True
    async def _get(self, key, default=None):
        return self.values.get(key, default)

class Response:
    def __init__(self, content, status_code=200, **kwargs):
        self.status_code, self.content = status_code, content

class Audio:
    filename = "test.wav"
    async def read(self, limit): return b"synthetic fixture"
    async def close(self): pass

# Execute the actual route and claim source without importing Modal or loading model images.
def load_functions(path, names, namespace):
    tree = ast.parse(path.read_text())
    nodes = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names:
            node.decorator_list = []
            nodes.append(node)
    module = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0), *nodes], type_ignores=[])
    exec(compile(ast.fix_missing_locations(module), str(path), "exec"), namespace)

class SubmissionTests(unittest.IsolatedAsyncioTestCase):
    async def test_claim_is_atomic_and_rejects_mismatched_input(self):
        for service in ["soulx-singer-svc", "song-catalog-analyzer"]:
            scope = {}
            load_functions(ROOT / "services" / service / "modal_app.py", {"_claim_submission"}, scope)
            index = FakeDict()
            results = await asyncio.gather(*[scope["_claim_submission"](index, "one", "digest", {"id": i}) for i in range(20)])
            self.assertEqual(sum(won for _, won in results), 1)
            self.assertEqual(len({entry["id"] for entry, _ in results}), 1)
            with self.assertRaises(ValueError): await scope["_claim_submission"](index, "one", "different", {})

    async def test_song_route_duplicate_and_spawn_response_loss(self):
        index = FakeDict()
        calls = 0
        lose_response = False
        async def spawn(*args):
            nonlocal calls
            calls += 1
            if lose_response: raise ConnectionError("spawn response lost")
            return SimpleNamespace(object_id="fc-one")
        scope = {"job_index": index, "hashlib": hashlib, "json": json, "time": time,
            "MAX_UPLOAD_BYTES": 100, "_validate_submission": lambda *args: None, "_audio_suffix": lambda *args: None,
            "JSONResponse": Response, "analyze_song": SimpleNamespace(spawn=SimpleNamespace(aio=spawn))}
        load_functions(ROOT / "services/song-catalog-analyzer/modal_app.py", {"_claim_submission", "submit_job"}, scope)
        route = scope["submit_job"]
        responses = await asyncio.gather(*[route(Audio(), "same", "S0000000001") for _ in range(20)])
        self.assertEqual(calls, 1)
        self.assertTrue(all(r.content["externalJobId"] == "fc-one" for r in responses))
        conflict = await route(Audio(), "same", "S0000000002")
        self.assertEqual(conflict.status_code, 409)
        lose_response = True
        with self.assertRaises(ConnectionError): await route(Audio(), "lost", "S0000000001")
        retry = await route(Audio(), "lost", "S0000000001")
        self.assertEqual(retry.status_code, 503)
        self.assertEqual(calls, 2)

    async def test_soulx_route_spawns_once_even_after_response_loss(self):
        class HTTPError(Exception):
            def __init__(self, status_code, detail, **kwargs):
                self.status_code = status_code
        calls = 0
        lost = False
        async def spawn(*args):
            nonlocal calls
            calls += 1
            if lost: raise ConnectionError("lost spawn response")
            return SimpleNamespace(object_id="fc-one")
        async def save(upload, path, limit):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"fixture")
        async def commit(): pass
        with tempfile.TemporaryDirectory() as directory:
            scope = {"File": lambda *a, **k: None, "Form": lambda value, **k: value,
                "uuid": uuid, "JOB_MOUNT": Path(directory), "shutil": shutil,
                "hashlib": hashlib, "json": json, "time": time,
                "_safe_audio_filename": lambda kind, name: kind + ".wav",
                "_save_upload": save, "_file_digest": lambda path: hashlib.sha256(path.read_bytes()).hexdigest(),
                "PROMPT_MAX_UPLOAD_BYTES": 100, "TARGET_MAX_UPLOAD_BYTES": 100,
                "job_volume": SimpleNamespace(commit=SimpleNamespace(aio=commit)),
                "request_index": FakeDict(), "job_store": FakeDict(), "HTTPException": HTTPError,
                "SoulXModel": lambda: SimpleNamespace(convert=SimpleNamespace(spawn=SimpleNamespace(aio=spawn))),
                "_public_job": lambda job_id, status, created_at, error=None: {"id": job_id, "status": status}}
            load_functions(ROOT / "services/soulx-singer-svc/modal_app.py", {"_claim_submission", "create_conversion"}, scope)
            route = scope["create_conversion"]
            results = await asyncio.gather(*[route(Audio(), Audio(), request_id="same") for _ in range(20)])
            self.assertEqual(calls, 1)
            self.assertEqual(len({r["id"] for r in results}), 1)
            with self.assertRaises(HTTPError) as conflict:
                await route(Audio(), Audio(), request_id="same", steps=33)
            self.assertEqual(conflict.exception.status_code, 409)
            lost = True
            with self.assertRaises(ConnectionError):
                await route(Audio(), Audio(), request_id="lost")
            with self.assertRaises(HTTPError) as unknown:
                await route(Audio(), Audio(), request_id="lost")
            self.assertEqual(unknown.exception.status_code, 503)
            self.assertEqual(calls, 2)

    async def test_vocal_route_never_recomputes_a_claimed_recording(self):
        class Upload:
            content_type = "audio/wav"
            def __init__(self): self.read_once = False
            async def read(self, limit):
                if self.read_once: return b""
                self.read_once = True
                return b"fixture"
            async def close(self): pass
        calls = 0
        async def analyze_file(**kwargs):
            nonlocal calls
            calls += 1
            return SimpleNamespace(source_path=kwargs["upload_path"], source_mime_type="audio/wav", synthesis_reference_path=None)
        class Rejected(Exception): pass
        modules = {
            "vocal_analysis_core.analysis": SimpleNamespace(AnalysisRejectedError=Rejected),
            "vocal_analysis_core.analysis_service": SimpleNamespace(analyze_recording_file=analyze_file, audio_suffix_for_mime_type=lambda _: ("audio/wav", ".wav")),
            "vocal_analysis_core.config": SimpleNamespace(MAX_UPLOAD_BYTES=100, UPLOAD_CHUNK_BYTES=100),
        }
        from contextlib import contextmanager
        @contextmanager
        def working_directory():
            with tempfile.TemporaryDirectory() as directory: yield Path(directory)
        scope = {"_prepare_analyzer_imports": lambda: None, "_normalize_recording_id": lambda value: str(uuid.UUID(value)),
            "ephemeral_working_directory": working_directory, "analysis_claims": FakeDict(),
            "time": time, "hashlib": hashlib, "json": json, "JSONResponse": Response,
            "build_profile_payload": lambda *a: {}, "build_analysis_envelope": lambda **k: {},
            "CONTAINER_INSTANCE_ID": "fixture", "CONTAINER_STARTED_AT_MS": 0, "CPU_CORES": 1, "MEMORY_MIB": 100,
            "LOGGER": SimpleNamespace(exception=lambda *a, **k: None),
            "_error_response": lambda *a, **k: Response({"reasonCode": "unexpected"}, status_code=500)}
        load_functions(ROOT / "services/vocal-profile-modal/modal_app.py", {"analyze"}, scope)
        with patch.dict(sys.modules, modules):
            recording_id = str(uuid.uuid4())
            responses = await asyncio.gather(*[scope["analyze"](Upload(), recording_id) for _ in range(20)])
            self.assertEqual(calls, 1)
            self.assertEqual(sum(r.status_code == 200 for r in responses), 1)
            self.assertEqual(sum(r.content.get("reasonCode") == "ANALYSIS_ALREADY_SUBMITTED" for r in responses), 19)
            conflict = await scope["analyze"](Upload(), recording_id, preset="different")
            self.assertEqual(conflict.content["reasonCode"], "IDEMPOTENCY_CONFLICT")
            self.assertEqual(calls, 1)

if __name__ == "__main__": unittest.main()
