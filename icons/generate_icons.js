const fs = require('fs');
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

function generatePng(size, filename) {
  const width = size;
  const height = size;

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Scanlines
  // Draw a stylish gradient icon with an open book / study graduation cap emblem
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    scanlines[offset++] = 0; // filter type 0: None
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      // Distance from center for rounded squircle
      const dx = (x - center) / (radius * 1.05);
      const dy = (y - center) / (radius * 1.05);
      const dist = Math.pow(Math.abs(dx), 3.5) + Math.pow(Math.abs(dy), 3.5);

      if (dist <= 1.0) {
        // Gradient from indigo #4f46e5 (79, 70, 229) to violet/pink #9333ea (147, 51, 234)
        let r = Math.round(79 + (147 - 79) * ny);
        let g = Math.round(70 + (51 - 70) * ny);
        let b = Math.round(229 + (234 - 229) * nx);

        // Simple book or pencil motif in center
        const cx = Math.abs(x - center) / size;
        const cy = (y - center) / size;

        // Draw an open book symbol in white
        const inBook = (cy >= -0.15 && cy <= 0.18 && cx >= 0.04 && cx <= 0.28 && (cy >= -0.15 + (cx - 0.04) * 0.4 || cy <= 0.14)) ||
                       (cy >= -0.22 && cy <= -0.16 && cx <= 0.30);
        
        // Simpler: Book pages
        const isPage = (Math.abs(cy) < 0.16 && cx > 0.02 && cx < 0.25 && Math.sin(cx * 15 - cy * 4) > -0.7);
        if (isPage || (Math.abs(cy) < 0.22 && Math.abs(x - center) < size * 0.02)) {
          // White symbol with subtle glow
          r = 255; g = 255; b = 255;
        }

        scanlines[offset++] = r;
        scanlines[offset++] = g;
        scanlines[offset++] = b;
        scanlines[offset++] = 255; // Alpha
      } else {
        // Transparent outside
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
        scanlines[offset++] = 0;
      }
    }
  }

  const idatData = zlib.deflateSync(scanlines);
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filename, png);
  console.log(`Generated ${filename} (${size}x${size}, ${png.length} bytes)`);
}

generatePng(192, 'icons/icon-192.png');
generatePng(512, 'icons/icon-512.png');
