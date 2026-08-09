import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Prisma Client is generated under the Shared DB owner but is not
    // hand-written FSD source.
    ignores: ["./src/shared/db/generated/prisma/**"],
  },
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
      "./src/features/analyze-vocal-profile/**",
      "./src/features/create-mixing/**",
      "./src/features/create-recommendation/**",
      "./src/features/development-conversion/**",
      "./src/features/manage-tickets/**",
    ],
    rules: {
      // Steiger does not count `_app` Route Handler and worker consumers as
      // slice references. Each listed Feature is consumed by an App endpoint
      // or worker, while some also have a Page consumer. Disabling the rule
      // for Create Mixing also hides its MixingJob Entity reference, so that
      // Entity is covered by the same narrow exception.
      "fsd/insignificant-slice": "off",
    },
  },
]);
