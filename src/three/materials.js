import * as THREE from 'three';
import { MATERIALS } from '../config.js';
import { createWoodTexture } from './woodTexture.js';
import { createParquetTexture } from './parquetTexture.js';
import { ROOM_DEPTH, ROOM_WIDTH } from './createRoom.js';

const ROUGHNESS = {
  white: 0.78,
  gray: 0.72,
  walnut: 0.62,
};

export function createMaterials(maxAnisotropy = 1) {
  const walnutColor = MATERIALS.find((m) => m.key === 'walnut').color;
  const woodTexture = createWoodTexture(walnutColor);
  woodTexture.anisotropy = Math.min(8, maxAnisotropy);

  const parquetTexture = createParquetTexture();
  parquetTexture.anisotropy = Math.min(16, maxAnisotropy);
  parquetTexture.repeat.set(ROOM_WIDTH, ROOM_DEPTH);

  const body = {};
  MATERIALS.forEach(({ key, color }) => {
    body[key] = new THREE.MeshStandardMaterial({
      color: key === 'walnut' ? '#ffffff' : color,
      map: key === 'walnut' ? woodTexture : null,
      roughness: ROUGHNESS[key],
      metalness: 0,
    });
  });

  const handle = new THREE.MeshStandardMaterial({
    color: '#2b2d30',
    metalness: 0.75,
    roughness: 0.32,
  });

  const floor = new THREE.MeshStandardMaterial({
    map: parquetTexture,
    roughness: 0.5,
    metalness: 0,
  });

  const wall = new THREE.MeshStandardMaterial({
    color: '#e6e4df',
    roughness: 0.95,
    metalness: 0,
  });

  const baseboard = new THREE.MeshStandardMaterial({
    color: '#f5f4f1',
    roughness: 0.55,
    metalness: 0,
  });

  const frame = new THREE.MeshStandardMaterial({
    color: '#f7f7f5',
    roughness: 0.35,
    metalness: 0,
  });

  const ceiling = new THREE.MeshStandardMaterial({
    color: '#f3f2ef',
    roughness: 0.95,
    metalness: 0,
  });

  const lampShade = new THREE.MeshStandardMaterial({
    color: '#26282b',
    roughness: 0.45,
    metalness: 0.6,
    side: THREE.DoubleSide,
  });

  const bulb = new THREE.MeshStandardMaterial({
    color: '#fff6e8',
    emissive: '#ffc98a',
    emissiveIntensity: 0,
  });

  const dimensionLine = new THREE.LineBasicMaterial({
    color: '#2b2e33',
    transparent: true,
    opacity: 0.9,
  });

  function dispose() {
    Object.values(body).forEach((material) => material.dispose());
    [
      handle,
      floor,
      wall,
      baseboard,
      frame,
      ceiling,
      lampShade,
      bulb,
      dimensionLine,
    ].forEach((m) => m.dispose());
    woodTexture.dispose();
    parquetTexture.dispose();
  }

  return {
    body,
    handle,
    floor,
    wall,
    baseboard,
    frame,
    ceiling,
    lampShade,
    bulb,
    dimensionLine,
    dispose,
  };
}
