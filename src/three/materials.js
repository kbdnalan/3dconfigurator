import * as THREE from 'three';
import { MATERIALS } from '../config.js';
import { createWoodTexture } from './woodTexture.js';
import { createParquetTexture } from './parquetTexture.js';
import { ROOM_SIZE } from './createRoom.js';

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
  parquetTexture.repeat.set(ROOM_SIZE * 2, ROOM_SIZE * 2);

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

  const dimensionLine = new THREE.LineBasicMaterial({
    color: '#3a3e44',
    transparent: true,
    opacity: 0.85,
  });

  function dispose() {
    Object.values(body).forEach((material) => material.dispose());
    [handle, floor, wall, baseboard, dimensionLine].forEach((m) => m.dispose());
    woodTexture.dispose();
    parquetTexture.dispose();
  }

  return { body, handle, floor, wall, baseboard, dimensionLine, dispose };
}
