import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ["./src/_app/**"],
    rules: {
      // @feature-sliced/filesystem recognizes `_app` as App while discovering
      // layers, but these two rules still inspect the physical folder name.
      "fsd/no-segmentless-slices": "off",
      "fsd/typo-in-layer-name": "off",
    },
  },
  {
    files: ["./src/_pages/**"],
    rules: {
      // The same prefixed-layer normalization gap also affects `_pages`.
      "fsd/typo-in-layer-name": "off",
    },
  },
  {
    files: [
      "./src/entities/mixing-job/**",
      "./src/entities/recommendation/**",
      "./src/entities/ticket/**",
      "./src/entities/vocal-profile/**",
      "./src/features/analyze-vocal-profile/**",
      "./src/features/authentication/**",
      "./src/features/create-mixing/**",
      "./src/features/create-recommendation/**",
      "./src/features/development-conversion/**",
      "./src/features/manage-tickets/**",
    ],
    rules: {
      // During the incremental migration, most consumers remain in the root
      // Next.js adapter outside Steiger's `./src` analysis root.
      "fsd/insignificant-slice": "off",
    },
  },
]);
