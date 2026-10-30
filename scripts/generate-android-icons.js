const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function renderIconPNG(size, options = {}) {
  const { isRound = false, isForegroundOnly = false } = options;
  const width = size;
  const height = size;

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const center = size / 2;
  const maskRadius = size * 0.46;

  for (let y = 0; y < height; y++) {
    scanlines[offset++] = 0; // Filter None
    const ny = y / height;

    for (let x = 0; x < width; x++) {
      const nx = x / width;

      // Distance from center
      const dx = (x - center) / maskRadius;
      const dy = (y - center) / maskRadius;

      let inMask = false;
      if (isForegroundOnly) {
        // Foreground has transparent background everywhere except the cap emblem
        inMask = true;
      } else if (isRound) {
        inMask = (dx * dx + dy * dy <= 1.0);
      } else {
        // Squircle shape
        inMask = (Math.pow(Math.abs(dx), 3.4) + Math.pow(Math.abs(dy), 3.4) <= 1.0);
      }

      if (!inMask) {
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
        continue;
      }

      // Default background: Dark OLED with deep purple / violet gradient
      let r = Math.round(18 + 55 * (1 - ny));
      let g = Math.round(14 + 20 * (1 - ny));
      let b = Math.round(32 + 130 * (1 - ny));
      let a = isForegroundOnly ? 0 : 255;

      // Draw Graduation Cap (Birrete) centered:
      // Normalized coordinates relative to center
      const rx = (x - center) / size;
      const ry = (y - center) / size;

      // 1. Diamond rhomboid top of cap: center at ry = -0.08
      const capTopY = ry - (-0.08);
      const capDiamond = Math.abs(rx) / 0.35 + Math.abs(capTopY) / 0.16;

      // 2. Skull cap base below:
      const inBase = (Math.abs(rx) <= 0.18 && ry >= -0.06 && ry <= 0.12 && (ry <= 0.08 + Math.pow(rx / 0.18, 2) * 0.04));

      // 3. Tassel cord:
      const inTasselCord = (rx >= 0.28 && rx <= 0.31 && ry >= -0.06 && ry <= 0.15) ||
                           (rx >= 0.0 && rx <= 0.30 && Math.abs(ry - (-0.08 + rx * 0.12)) <= 0.015);
      const inTasselDrop = Math.hypot(rx - 0.295, ry - 0.17) <= 0.035;

      // 4. Open Book / Pages at bottom:
      const inBook = (ry >= 0.17 && ry <= 0.32 && Math.abs(rx) >= 0.02 && Math.abs(rx) <= 0.34 &&
                      ry >= 0.17 + (Math.abs(rx) - 0.02) * 0.2);

      const inEmblem = (capDiamond <= 1.0) || inBase || inTasselCord || inTasselDrop || inBook;

      if (inEmblem) {
        if (inTasselCord || inTasselDrop) {
          // Neon Emerald / Gold accent for tassel
          r = 16;
          g = 185;
          b = 129; // Emerald #10B981
          a = 255;
        } else if (inBook) {
          // Soft white pages
          r = 240;
          g = 244;
          b = 255;
          a = 245;
        } else {
          // Crisp White / Violet highlight on Cap
          if (capDiamond <= 0.88) {
            r = 255;
            g = 255;
            b = 255;
          } else {
            // Cap edge purple glow
            r = 168;
            g = 85;
            b = 247;
          }
          a = 255;
        }
      }

      scanlines[offset++] = r;
      scanlines[offset++] = g;
      scanlines[offset++] = b;
      scanlines[offset++] = a;
    }
  }

  const idatData = zlib.deflateSync(scanlines);
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure directories and generate icons
const rootDir = path.resolve(__dirname, '..');
const resDir = path.resolve(rootDir, 'android/app/src/main/res');

const densities = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 }
];

for (const d of densities) {
  const targetDir = path.join(resDir, d.folder);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  // Standard icon (squircle)
  const pngSquare = renderIconPNG(d.size, { isRound: false });
  fs.writeFileSync(path.join(targetDir, 'ic_launcher.png'), pngSquare);

  // Round icon
  const pngRound = renderIconPNG(d.size, { isRound: true });
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), pngRound);

  // Adaptive foreground
  const pngForeground = renderIconPNG(d.size * 2, { isForegroundOnly: true });
  fs.writeFileSync(path.join(targetDir, 'ic_launcher_foreground.png'), pngForeground);

  console.log(`✓ Generado en ${d.folder} (${d.size}x${d.size})`);
}

// High-res icons in root icons/ folder
const iconsDir = path.resolve(rootDir, 'icons');
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), renderIconPNG(512, { isRound: false }));
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), renderIconPNG(192, { isRound: false }));
console.log('✓ Iconos 512x512 y 192x192 generados en icons/');

// Actualizar background adaptive color a Dark OLED #0B0D13
const bgXmlPath = path.join(resDir, 'values/ic_launcher_background.xml');
const bgXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0B0D13</color>
</resources>
`;
fs.writeFileSync(bgXmlPath, bgXmlContent, 'utf-8');
console.log('✓ ic_launcher_background.xml actualizado a #0B0D13');
