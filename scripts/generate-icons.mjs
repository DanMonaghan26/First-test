import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

// Minimal PNG encoder: builds a raw RGBA framebuffer, deflates it, and
// wraps it in the handful of PNG chunks needed for a static icon.
function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0; // filter: none
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const bg = [79, 70, 229]; // indigo-600
  const white = [255, 255, 255];

  const set = (x, y, color, alpha = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    rgba[i] = color[0];
    rgba[i + 1] = color[1];
    rgba[i + 2] = color[2];
    rgba[i + 3] = alpha;
  };

  const cornerRadius = size * 0.18;
  const inCorner = (x, y) => {
    const cx = x < cornerRadius ? cornerRadius : x > size - cornerRadius ? size - cornerRadius : null;
    const cy = y < cornerRadius ? cornerRadius : y > size - cornerRadius ? size - cornerRadius : null;
    if (cx === null || cy === null) return true;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= cornerRadius * cornerRadius;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inCorner(x, y)) set(x, y, bg);
    }
  }

  // Calendar body
  const bodyX = size * 0.2;
  const bodyY = size * 0.28;
  const bodyW = size * 0.6;
  const bodyH = size * 0.52;
  for (let y = bodyY; y < bodyY + bodyH; y++) {
    for (let x = bodyX; x < bodyX + bodyW; x++) {
      set(Math.round(x), Math.round(y), white);
    }
  }

  // Header strip (slightly darker so it reads as a calendar header)
  const headerH = size * 0.12;
  const headerColor = [199, 210, 254]; // indigo-200
  for (let y = bodyY; y < bodyY + headerH; y++) {
    for (let x = bodyX; x < bodyX + bodyW; x++) {
      set(Math.round(x), Math.round(y), headerColor);
    }
  }

  // Two "rings" at the top
  const ringW = size * 0.05;
  const ringH = size * 0.1;
  for (const cx of [bodyX + bodyW * 0.25, bodyX + bodyW * 0.75]) {
    for (let y = bodyY - ringH * 0.4; y < bodyY + ringH * 0.5; y++) {
      for (let x = cx - ringW / 2; x < cx + ringW / 2; x++) {
        set(Math.round(x), Math.round(y), bg);
      }
    }
  }

  // Grid dots inside the body (simple 3x3 grid of squares)
  const gridStartY = bodyY + headerH + size * 0.06;
  const gridAreaH = bodyY + bodyH - gridStartY - size * 0.04;
  const dotSize = size * 0.05;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const dx = bodyX + size * 0.08 + col * (size * 0.18);
      const dy = gridStartY + row * (gridAreaH / 3);
      for (let y = dy; y < dy + dotSize; y++) {
        for (let x = dx; x < dx + dotSize; x++) {
          set(Math.round(x), Math.round(y), bg);
        }
      }
    }
  }

  return rgba;
}

function writeIcon(size, path) {
  const rgba = drawIcon(size);
  const png = encodePng(size, size, rgba);
  writeFileSync(path, png);
  console.log(`wrote ${path} (${size}x${size})`);
}

writeIcon(192, new URL("../public/icon-192.png", import.meta.url));
writeIcon(512, new URL("../public/icon-512.png", import.meta.url));
writeIcon(180, new URL("../public/apple-touch-icon.png", import.meta.url));
writeIcon(32, new URL("../public/favicon-32.png", import.meta.url));
