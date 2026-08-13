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
