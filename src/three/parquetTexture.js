import * as THREE from 'three';

function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZE = 1024;
const ROWS = 8;
const ROW_HEIGHT = SIZE / ROWS;
const GAP = 2;

function drawPlank(ctx, random, x, y, length, tone) {
  const r = Math.round(184 * tone);
  const g = Math.round(158 * tone);
  const b = Math.round(126 * tone);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + GAP / 2, y + GAP / 2, length - GAP, ROW_HEIGHT - GAP);
  ctx.clip();

  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(x, y, length, ROW_HEIGHT);

  for (let i = 0; i < 26; i += 1) {
    const lineY = y + random() * ROW_HEIGHT;
    const amplitude = 1 + random() * 3;
    const frequency = 0.004 + random() * 0.01;
    const phase = random() * Math.PI * 2;
    const dark = random() > 0.4;
    const alpha = dark ? 0.05 + random() * 0.12 : 0.04 + random() * 0.08;

    ctx.strokeStyle = dark
      ? `rgba(92, 62, 34, ${alpha})`
      : `rgba(232, 204, 166, ${alpha})`;
    ctx.lineWidth = 0.5 + random() * 1.5;
    ctx.beginPath();
    for (let px = x; px <= x + length; px += 8) {
      const py = lineY + Math.sin(px * frequency + phase) * amplitude;
      if (px === x) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.restore();
}

export function createParquetTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const random = createRandom(7341);

  ctx.fillStyle = '#5f5040';
  ctx.fillRect(0, 0, SIZE, SIZE);

  for (let row = 0; row < ROWS; row += 1) {
    const y = row * ROW_HEIGHT;
    let x = -random() * SIZE * 0.6;

    while (x < SIZE) {
      const length = 360 + random() * 380;
      const tone = 0.86 + random() * 0.2;
      const plankSeed = random();

      for (const shift of [0, SIZE, -SIZE]) {
        const copyRandom = createRandom(Math.floor(plankSeed * 1e9));
        drawPlank(ctx, copyRandom, x + shift, y, length, tone);
      }
      x += length;
    }
  }

  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (random() - 0.5) * 8;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
