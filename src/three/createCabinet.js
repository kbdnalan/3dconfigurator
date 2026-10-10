import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const MM = 0.001;

const PANEL = 18 * MM;
const BACK = 6 * MM;
const DOOR = 18 * MM;
const DOOR_REVEAL = 2 * MM;
const DOOR_CLEARANCE = 1 * MM;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createPanel(name, size, position, material, rounded = false) {
  const [sx, sy, sz] = size;
  const geometry = rounded
    ? new RoundedBoxGeometry(sx, sy, sz, 2, 1.5 * MM)
    : new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.part = 'body';
  return mesh;
}

function createHandle(doorWidth, doorHeight, material) {
  const group = new THREE.Group();
  group.name = 'handle';

  const length = clamp(doorHeight * 0.18, 70 * MM, 200 * MM);
  const barRadius = 5 * MM;
  const postRadius = 3.5 * MM;
  const postLength = 22 * MM;

  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(barRadius, barRadius, length, 24),
    material,
  );
  bar.position.z = postLength + barRadius;

  const postGeometry = new THREE.CylinderGeometry(postRadius, postRadius, postLength, 16);
  postGeometry.rotateX(Math.PI / 2);
  postGeometry.translate(0, 0, postLength / 2);
  const postOffset = length / 2 - 12 * MM;
  const topPost = new THREE.Mesh(postGeometry, material);
  topPost.position.y = postOffset;
  const bottomPost = new THREE.Mesh(postGeometry, material);
  bottomPost.position.y = -postOffset;

  [bar, topPost, bottomPost].forEach((mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  const sideInset = clamp(doorWidth * 0.08, 35 * MM, 60 * MM);
  const topInset = clamp(doorHeight * 0.08, 40 * MM, 100 * MM);
  group.position.set(
    doorWidth / 2 - sideInset,
    doorHeight / 2 - topInset - length / 2,
    DOOR / 2,
  );
  return group;
}

export function createCabinet(dimensions, materials, materialKey) {
  const W = dimensions.width * MM;
  const H = dimensions.height * MM;
  const D = dimensions.depth * MM;
  const body = materials.body[materialKey];

  const carcassDepth = D - DOOR - DOOR_CLEARANCE;
  const backZ = -D / 2;
  const carcassCenterZ = backZ + carcassDepth / 2;
  const innerWidth = W - 2 * PANEL;

  const cabinet = new THREE.Group();
  cabinet.name = 'cabinet';

  cabinet.add(
    createPanel(
      'top',
      [W, PANEL, carcassDepth],
      [0, H - PANEL / 2, carcassCenterZ],
      body,
    ),
  );

  const sideHeight = H - PANEL;
  const sideX = W / 2 - PANEL / 2;
  cabinet.add(
    createPanel(
      'side-left',
      [PANEL, sideHeight, carcassDepth],
      [-sideX, sideHeight / 2, carcassCenterZ],
      body,
    ),
  );
  cabinet.add(
    createPanel(
      'side-right',
      [PANEL, sideHeight, carcassDepth],
      [sideX, sideHeight / 2, carcassCenterZ],
      body,
    ),
  );

  cabinet.add(
    createPanel(
      'bottom',
      [innerWidth, PANEL, carcassDepth],
      [0, PANEL / 2, carcassCenterZ],
      body,
    ),
  );

  const backHeight = H - 2 * PANEL;
  cabinet.add(
    createPanel(
      'back',
      [innerWidth, backHeight, BACK],
      [0, PANEL + backHeight / 2, backZ + BACK / 2],
      body,
    ),
  );

  const doorWidth = W - 2 * DOOR_REVEAL;
  const doorHeight = H - 2 * DOOR_REVEAL;

  const doorPivot = new THREE.Group();
  doorPivot.name = 'door-pivot';
  doorPivot.position.set(-doorWidth / 2, 0, D / 2 - DOOR);

  const door = createPanel(
    'door',
    [doorWidth, doorHeight, DOOR],
    [doorWidth / 2, H / 2, DOOR / 2],
    body,
    true,
  );
  door.add(createHandle(doorWidth, doorHeight, materials.handle));
  doorPivot.add(door);
  cabinet.add(doorPivot);

  cabinet.userData.doorPivot = doorPivot;

  return cabinet;
}
