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

await sharp(fileURLToPath(new URL("../public/brand/copy-singer-og.svg", import.meta.url)))
  .resize(1200, 630, { fit: "fill" })
  .flatten({ background: "#f8f9fb" })
  .removeAlpha()
  .png({ compressionLevel: 9, palette: false })
  .toFile(fileURLToPath(new URL("../public/og.png", import.meta.url)));
