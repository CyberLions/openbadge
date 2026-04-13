// @ts-expect-error no type declarations for pngjs
import { PNG } from "pngjs";
import fs from "fs";

/**
 * Bake an Open Badges assertion into a PNG image by adding an iTXt chunk.
 * The iTXt chunk uses keyword "openbadges" and the value is either
 * a hosted URL or a JWS compact serialization string.
 */
export function bakePng(
  imagePath: string,
  assertionData: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(imagePath);
    const png = new PNG();

    png.parse(data, (err: Error | null) => {
      if (err) return reject(err);

      // Build the iTXt chunk manually
      const keyword = "openbadges";
      const keywordBuf = Buffer.from(keyword, "latin1");
      const nullByte = Buffer.alloc(1, 0);
      const compressionFlag = Buffer.alloc(1, 0); // no compression
      const compressionMethod = Buffer.alloc(1, 0);
      const languageTag = Buffer.alloc(0); // empty
      const translatedKeyword = Buffer.alloc(0); // empty
      const textBuf = Buffer.from(assertionData, "utf-8");

      const chunkData = Buffer.concat([
        keywordBuf,
        nullByte,
        compressionFlag,
        compressionMethod,
        languageTag,
        nullByte,
        translatedKeyword,
        nullByte,
        textBuf,
      ]);

      // Pack the PNG with the custom chunk
      const chunks: Buffer[] = [];
      const stream = png.pack();

      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        const original = Buffer.concat(chunks);

        // Insert iTXt chunk before IEND (last 12 bytes)
        const iendStart = original.length - 12;
        const before = original.subarray(0, iendStart);
        const iend = original.subarray(iendStart);

        // iTXt chunk: length(4) + type(4) + data + crc(4)
        const chunkType = Buffer.from("iTXt", "ascii");
        const lengthBuf = Buffer.alloc(4);
        lengthBuf.writeUInt32BE(chunkData.length);

        // CRC over type + data
        const { crc32 } = require("./crc32");
        const crcData = Buffer.concat([chunkType, chunkData]);
        const crcBuf = Buffer.alloc(4);
        crcBuf.writeUInt32BE(crc32(crcData) >>> 0);

        const bakedPng = Buffer.concat([
          before,
          lengthBuf,
          chunkType,
          chunkData,
          crcBuf,
          iend,
        ]);

        resolve(bakedPng);
      });
      stream.on("error", reject);
    });
  });
}
