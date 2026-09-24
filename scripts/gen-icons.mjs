// One-off icon generator — no image libs installed, so this hand-rolls a
// minimal PNG encoder (zlib is built into Node) and rasterizes a simple mark
// matching the app's existing dark-square "Waypoints" logo treatment.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const abLen2 = abx * abx + aby * aby;
  let t = abLen2 === 0 ? 0 : (apx * abx + apy * aby) / abLen2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx, cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

function drawIcon(size, { padded = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const bg = [15, 23, 42]; // slate-900
  const fg = [255, 255, 255];
  const radius = padded ? 0 : size * 0.22; // maskable icons: no rounding, safe-zone padding instead
  const inset = padded ? size * 0.1 : 0;

  const nodes = [
    [0.32, 0.68],
    [0.52, 0.34],
    [0.74, 0.56],
  ].map(([x, y]) => [inset + x * (size - 2 * inset), inset + y * (size - 2 * inset)]);
  const nodeR = size * (padded ? 0.05 : 0.06);
  const lineW = size * (padded ? 0.038 : 0.045);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let inRounded = true;
      if (radius > 0) {
        const cx = x < radius ? radius : x > size - radius ? size - radius : x;
        const cy = y < radius ? radius : y > size - radius ? size - radius : y;
        const dx = x - cx, dy = y - cy;
        if ((x < radius || x > size - radius) && (y < radius || y > size - radius)) {
          inRounded = dx * dx + dy * dy <= radius * radius;
        }
      }
      if (!inRounded) {
        buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0;
        continue;
      }
      let isFg = false;
      for (let n = 0; n < nodes.length; n++) {
        if (Math.hypot(x - nodes[n][0], y - nodes[n][1]) <= nodeR) { isFg = true; break; }
      }
      if (!isFg) {
        for (let n = 0; n < nodes.length - 1; n++) {
          const [ax, ay] = nodes[n], [bx, by] = nodes[n + 1];
          if (distToSegment(x, y, ax, ay, bx, by) <= lineW / 2) { isFg = true; break; }
        }
      }
      const [r, g, b] = isFg ? fg : bg;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = 255;
    }
  }
  return buf;
}

mkdirSync(new URL("../public/icons", import.meta.url), { recursive: true });

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "maskable-192.png", size: 192, padded: true },
  { name: "maskable-512.png", size: 512, padded: true },
];

for (const t of targets) {
  const png = encodePNG(t.size, t.size, drawIcon(t.size, { padded: t.padded }));
  writeFileSync(new URL(`../public/icons/${t.name}`, import.meta.url), png);
  console.log(`wrote public/icons/${t.name} (${t.size}x${t.size})`);
}
