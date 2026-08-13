from __future__ import annotations

import inspect
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import modal_app


class ModalCatalogAnalyzerTest(unittest.TestCase):
    def test_submission_contract_rejects_invalid_identity_and_size(self) -> None:
        modal_app._validate_submission("job-id", "HdTUQhHHJEg", 1024)
        with self.assertRaisesRegex(ValueError, "INVALID_REQUEST_ID"):
            modal_app._validate_submission("", "HdTUQhHHJEg", 1024)
        with self.assertRaisesRegex(ValueError, "INVALID_SOURCE_VIDEO_ID"):
            modal_app._validate_submission("job-id", "short", 1024)
        with self.assertRaisesRegex(ValueError, "EMPTY_AUDIO"):
            modal_app._validate_submission("job-id", "HdTUQhHHJEg", 0)
        with self.assertRaisesRegex(ValueError, "PAYLOAD_TOO_LARGE"):
            modal_app._validate_submission(
                "job-id",
                "HdTUQhHHJEg",
                modal_app.MAX_UPLOAD_BYTES + 1,
            )

    def test_audio_suffix_is_allowlisted(self) -> None:
        self.assertEqual(modal_app._audio_suffix("target.M4A"), ".m4a")
        with self.assertRaisesRegex(ValueError, "UNSUPPORTED_AUDIO"):
            modal_app._audio_suffix("target.exe")

    def test_key_estimator_matches_major_and_minor_profiles(self) -> None:
        major_key, major_confidence = modal_app._estimate_key(list(modal_app.MAJOR_KEY_PROFILE))
        self.assertEqual(major_key, "C")
        self.assertGreater(major_confidence, 0)
        a_minor = [modal_app.MINOR_KEY_PROFILE[(pitch_class - 9) % 12] for pitch_class in range(12)]
        minor_key, minor_confidence = modal_app._estimate_key(a_minor)
        self.assertEqual(minor_key, "Am")
        self.assertGreater(minor_confidence, 0)
        self.assertEqual(modal_app._estimate_key([0.0] * 12), (None, 0.0))

    def test_service_uses_cpu_spawn_poll_and_idempotency_index(self) -> None:
        source = inspect.getsource(modal_app)
        self.assertEqual(modal_app.ANALYSIS_CPU_CORES, 8.0)
        self.assertEqual(modal_app.ANALYSIS_MEMORY_MB, 16_384)
        self.assertIn("analyze_song.spawn.aio", source)
        self.assertIn("modal.FunctionCall.from_id", source)
        self.assertIn("job_index.get.aio(request_id", source)
        self.assertIn("job_index.put.aio(request_id", source)
        self.assertIn('"--device",\n                "cpu"', source)
        self.assertNotIn("gpu=", source)
        self.assertIn("chroma_cqt", source)
        self.assertIn('"fastapi==0.141.1"', source)
        self.assertNotIn("yt_dlp", source)


if __name__ == "__main__":
    unittest.main()
