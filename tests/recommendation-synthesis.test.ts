import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHESIS_PRESET } from "../src/entities/recommendation";

test("mixing preset uses the server-validated recommendation shift", () => {
  assert.equal(SYNTHESIS_PRESET.auto_pitch_shift, false);
  assert.equal(SYNTHESIS_PRESET.pitch_shift, 0);
  assert.equal(SYNTHESIS_PRESET.target_vocal_separation, true);
  assert.equal(SYNTHESIS_PRESET.auto_mix_accompaniment, true);
});
