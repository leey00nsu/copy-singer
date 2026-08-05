from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path

import modal_app


class ModalCatalogAnalyzerTest(unittest.TestCase):
    def test_select_candidates_supports_the_full_catalog_with_a_hard_upper_bound(self) -> None:
        artifact = {"songs": [{"status": "READY"}] + [{"status": "PENDING", "rank": i} for i in range(5)]}
        selected = modal_app._select_candidates(artifact, 5)
        self.assertEqual([entry["rank"] for entry in selected], [0, 1, 2, 3, 4])
        with self.assertRaisesRegex(ValueError, "between 1 and 100"):
            modal_app._select_candidates(artifact, 101)

    def test_write_artifact_replaces_json_without_leaving_temp_file(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "profiles.json"
            modal_app._write_artifact({"schemaVersion": 1, "songs": []}, path)
            self.assertEqual(json.loads(path.read_text()), {"schemaVersion": 1, "songs": []})
            self.assertEqual(list(Path(temporary).iterdir()), [path])

    def test_local_temp_root_uses_configured_writable_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            configured = Path(temporary) / "external-temp"
            previous = os.environ.get("COPY_SINGER_TEMP_ROOT")
            os.environ["COPY_SINGER_TEMP_ROOT"] = str(configured)
            try:
                self.assertEqual(modal_app._local_temp_root(), configured.resolve())
                self.assertTrue(configured.is_dir())
            finally:
                if previous is None:
                    os.environ.pop("COPY_SINGER_TEMP_ROOT", None)
                else:
                    os.environ["COPY_SINGER_TEMP_ROOT"] = previous


if __name__ == "__main__":
    unittest.main()
