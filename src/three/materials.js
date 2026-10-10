import * as THREE from 'three';
import { MATERIALS } from '../config.js';
import { createWoodTexture } from './woodTexture.js';

const ROUGHNESS = {
  white: 0.78,
  gray: 0.72,
  walnut: 0.62,
};

export function createMaterials(maxAnisotropy = 1) {
  const walnutColor = MATERIALS.find((m) => m.key === 'walnut').color;
  const woodTexture = createWoodTexture(walnutColor);
  woodTexture.anisotropy = Math.min(8, maxAnisotropy);

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
    metalness: 0.3,
    roughness: 0.4,
  });

  const dimensionLine = new THREE.LineBasicMaterial({
    color: '#3a3e44',
    transparent: true,
    opacity: 0.85,
  });

  function dispose() {
    Object.values(body).forEach((material) => material.dispose());
    handle.dispose();
    dimensionLine.dispose();
    woodTexture.dispose();
  }

  return { body, handle, dimensionLine, dispose };
}
