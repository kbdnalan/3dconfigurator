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

export function createWoodTexture(baseColor = '#805333') {
  const width = 512;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const random = createRandom(20240611);

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 14; i += 1) {
    const x = random() * width;
    const bandWidth = 20 + random() * 60;
    const dark = random() > 0.5;
    ctx.fillStyle = dark ? 'rgba(52, 30, 14, 0.07)' : 'rgba(176, 124, 82, 0.07)';
    ctx.fillRect(x, 0, bandWidth, height);
  }

  for (let i = 0; i < 180; i += 1) {
    const startX = random() * width;
    const amplitude = 1 + random() * 5;
    const frequency = 0.002 + random() * 0.006;
    const phase = random() * Math.PI * 2;
    const dark = random() > 0.35;
    const alpha = dark ? 0.08 + random() * 0.18 : 0.05 + random() * 0.1;

    ctx.strokeStyle = dark
      ? `rgba(48, 27, 12, ${alpha})`
      : `rgba(186, 136, 92, ${alpha})`;
    ctx.lineWidth = 0.6 + random() * 1.8;
    ctx.beginPath();
    for (let y = 0; y <= height; y += 8) {
      const x = startX + Math.sin(y * frequency + phase) * amplitude;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const image = ctx.getImageData(0, 0, width, height);
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (random() - 0.5) * 10;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
