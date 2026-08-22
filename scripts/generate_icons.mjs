/**
 * generate_icons.mjs
 * Generates 16x16, 48x48, and 128x128 PNG icons for the VBD Sleeper extension.
 * Uses standard Node.js built-in zlib without external dependencies.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync, crc32 } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = resolve(__dirname, '..', 'extension', 'icons');

if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

// Calculate CRC32 for PNG chunks
function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  let checksum = 0;
  if (typeof crc32 === 'function') {
    checksum = crc32(body);
  } else {
    let c = ~0;
    for (let i = 0; i < body.length; i++) {
      c ^= body[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    checksum = ~c >>> 0;
  }

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(checksum, 0);

  return Buffer.concat([len, body, crcBuf]);
}

function generatePng(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr.writeUInt8(8, 8);      // bit depth (8)
  ihdr.writeUInt8(6, 9);      // color type (6 = RGBA)
  ihdr.writeUInt8(0, 10);     // compression (0)
  ihdr.writeUInt8(0, 11);     // filter (0)
  ihdr.writeUInt8(0, 12);     // interlace (0)

  // Pixel data (RGBA)
  const scanlineLength = size * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * size);

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // No filter

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Gradient background: Cyan to Indigo
        const t = (x + y) / (size * 2);
        const r = Math.round(6 + (99 - 6) * t);
        const g = Math.round(182 + (102 - 182) * t);
        const b = Math.round(212 + (241 - 212) * t);

        const nx = dx / (size * 0.5);
        const ny = dy / (size * 0.5);

        const vLeft = Math.abs(ny - (2 * (-nx) - 0.2));
        const vRight = Math.abs(ny - (2 * (nx) - 0.2));
        const isV = (nx <= 0.05 && nx >= -0.5 && ny >= -0.3 && ny <= 0.35 && vLeft < 0.22) ||
                    (nx >= -0.05 && nx <= 0.5 && ny >= -0.3 && ny <= 0.35 && vRight < 0.22);

        if (isV) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
          rawData[pxOffset + 3] = 255;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressedData = deflateSync(rawData);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const sizes = [16, 48, 128];
for (const size of sizes) {
  const pngBuf = generatePng(size);
  const outPath = resolve(ICONS_DIR, `icon-${size}.png`);
  writeFileSync(outPath, pngBuf);
  console.log(`Generated: ${outPath} (${pngBuf.length} bytes)`);
}
