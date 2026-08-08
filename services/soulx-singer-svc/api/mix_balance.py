from __future__ import annotations

VOCAL_BALANCE_VERSION = "vocal-balance-v2"
VOCAL_GAIN_DB = -2.0
ACCOMPANIMENT_GAIN_DB = 0.0


def db_to_linear_gain(decibels: float) -> float:
    return 10.0 ** (decibels / 20.0)


def peak_protection_gain(peak: float) -> float:
    if peak <= 1.0:
        return 1.0
    return 1.0 / peak
