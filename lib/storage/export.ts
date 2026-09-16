import "server-only";

import { getExportPreset, type ExportPreset } from "@/config/marketplace";

/**
 * Marketplace export rendering.
 *
 * Marketplaces reject uploads that miss their published rules, so each preset
 * is applied exactly: "contain" pads to the mandated canvas on a flat
 * background (Amazon requires pure white), "cover" crops to fill it.
 */

async function sharpLib() {
  return (await import("sharp")).default;
}

/** Converts "#RRGGBB" into the channel object sharp expects. */
function parseHex(hex: string): { r: number; g: number; b: number; alpha: number } {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
    alpha: 1,
  };
}

export async function renderExport(params: {
  image: Buffer;
  preset: ExportPreset;
}): Promise<{ data: Buffer; contentType: string; extension: string }> {
  const sharp = await sharpLib();
  const { preset } = params;

  let pipeline = sharp(params.image).resize(preset.width, preset.height, {
    fit: preset.fit,
    background: parseHex(preset.background),
    // Never enlarge past the source — that would soften the result.
    withoutEnlargement: false,
  });

  // Flatten before JPEG: it has no alpha, and unflattened transparency renders black.
  if (preset.format === "jpeg") {
    pipeline = pipeline.flatten({ background: parseHex(preset.background) });
  }

  const data =
    preset.format === "jpeg"
      ? await pipeline.jpeg({ quality: preset.quality, mozjpeg: true }).toBuffer()
      : await pipeline.png().toBuffer();

  return {
    data,
    contentType: preset.format === "jpeg" ? "image/jpeg" : "image/png",
    extension: preset.format === "jpeg" ? "jpg" : "png",
  };
}

export function requireExportPreset(presetId: string): ExportPreset {
  const preset = getExportPreset(presetId);
  if (!preset) throw new Error(`Unknown export preset: ${presetId}`);
  return preset;
}

/**
 * Minimal ZIP writer (stored, no compression).
 *
 * JPEG and PNG are already compressed, so deflating again buys almost nothing
 * and would mean pulling in a dependency. This keeps multi-file export
 * self-contained.
 */
export function createZip(files: { name: string; data: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuffer = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const size = file.data.length;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // local file header signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // method: stored
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18); // compressed size
    localHeader.writeUInt32LE(size, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra length

    chunks.push(localHeader, nameBuffer, file.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central directory signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(size, 20);
    centralHeader.writeUInt32LE(size, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    central.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + size;
  }

  const centralBuffer = Buffer.concat(central);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuffer, end]);
}

let crcTable: number[] | null = null;

function crc32(buffer: Buffer): number {
  if (!crcTable) {
    crcTable = [];
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[i] = c >>> 0;
    }
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
