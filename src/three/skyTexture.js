import * as THREE from 'three';

export function createSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#6f9fd6');
  gradient.addColorStop(0.45, '#a9c8ea');
  gradient.addColorStop(0.6, '#e8eef3');
  gradient.addColorStop(0.62, '#b9bfb0');
  gradient.addColorStop(0.7, '#8e9a85');
  gradient.addColorStop(1, '#6f7a66');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
