from __future__ import annotations

import math
import sys
import unittest
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from api.mix_balance import (  # noqa: E402
    ACCOMPANIMENT_GAIN_DB,
    VOCAL_BALANCE_VERSION,
    VOCAL_GAIN_DB,
    db_to_linear_gain,
    peak_protection_gain,
)


class MixBalanceTests(unittest.TestCase):
    def test_vocal_balance_contract(self) -> None:
        self.assertEqual(VOCAL_BALANCE_VERSION, "vocal-balance-v2")
        self.assertEqual(VOCAL_GAIN_DB, -2.0)
        self.assertEqual(ACCOMPANIMENT_GAIN_DB, 0.0)
        self.assertTrue(math.isclose(db_to_linear_gain(VOCAL_GAIN_DB), 0.7943282347, rel_tol=1e-9))
        self.assertEqual(db_to_linear_gain(ACCOMPANIMENT_GAIN_DB), 1.0)

    def test_peak_protection_only_attenuates_over_full_scale(self) -> None:
        self.assertEqual(peak_protection_gain(0.8), 1.0)
        self.assertEqual(peak_protection_gain(1.0), 1.0)
        self.assertTrue(math.isclose(peak_protection_gain(1.25), 0.8, rel_tol=1e-12))


if __name__ == "__main__":
    unittest.main()
