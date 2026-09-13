import ast
import asyncio
import hashlib
import json
import time
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
    def __init__(self, status_code, content, **kwargs):
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

if __name__ == "__main__": unittest.main()
