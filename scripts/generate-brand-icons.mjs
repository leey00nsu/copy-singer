import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(new URL("../public/brand/copy-singer-mark.svg", import.meta.url));
const outputs = [
  { size: 64, target: fileURLToPath(new URL("../public/favicon.png", import.meta.url)) },
  { size: 180, target: fileURLToPath(new URL("../public/apple-touch-icon.png", import.meta.url)) },
];

await Promise.all(
  outputs.map(({ size, target }) =>
    sharp(source)
      .resize(size, size, { fit: "fill", kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9, palette: false })
      .toFile(target),
  ),
);

const ogSource = await readFile(new URL("../public/brand/copy-singer-og.svg", import.meta.url), "utf8");
const paperlogy = await readFile(new URL("../src/_app/fonts/Paperlogy-7Bold.ttf", import.meta.url));
const ogWithEmbeddedFont = ogSource.replace(
  "<style>",
  `<style>@font-face { font-family: "Paperlogy"; src: url("data:font/ttf;base64,${paperlogy.toString("base64")}"); font-weight: 700; }`,
);

await sharp(Buffer.from(ogWithEmbeddedFont))
  .resize(1200, 630, { fit: "fill" })
  .flatten({ background: "#ffffff" })
  .removeAlpha()
  .png({ compressionLevel: 9, palette: false })
  .toFile(fileURLToPath(new URL("../public/og.png", import.meta.url)));
