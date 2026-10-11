import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const MM = 0.001;

const PANEL = 18 * MM;
const BACK = 6 * MM;
const DOOR = 18 * MM;
const DOOR_REVEAL = 2 * MM;
const DOOR_CLEARANCE = 1 * MM;
const DOORS_CENTER_GAP = 3 * MM;
const PLINTH_HEIGHT = 80 * MM;
const PLINTH_INSET = 40 * MM;
const SHELF_SETBACK = 20 * MM;
const SHELF_STEP = 380 * MM;
const DOUBLE_DOOR_FROM_WIDTH = 800;

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

function createHandle(doorWidth, doorHeight, side, material) {
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
  group.position.set(side * (doorWidth / 2 - sideInset), 0, DOOR / 2);
  return group;
}

function createDoor({
  key,
  hingeX,
  sign,
  width,
  height,
  centerY,
  frontZ,
  materials,
  body,
}) {
  const pivot = new THREE.Group();
  pivot.name = `door-pivot-${key}`;
  pivot.position.set(hingeX, 0, frontZ - DOOR);

  const door = createPanel(
    `door-${key}`,
    [width, height, DOOR],
    [(-sign * width) / 2, centerY, DOOR / 2],
    body,
    true,
  );
  door.add(createHandle(width, height, -sign, materials.handle));
  pivot.add(door);

  pivot.userData = { key, sign, hingeX, width };
  return pivot;
}

export function createCabinet(dimensions, materials, materialKey) {
  const W = dimensions.width * MM;
  const H = dimensions.height * MM;
  const D = dimensions.depth * MM;
  const body = materials.body[materialKey];

  const carcassDepth = D - DOOR - DOOR_CLEARANCE;
  const backZ = -D / 2;
  const carcassFrontZ = backZ + carcassDepth;
  const carcassCenterZ = backZ + carcassDepth / 2;
  const innerWidth = W - 2 * PANEL;
  const innerBottom = PLINTH_HEIGHT + PANEL;
  const innerTop = H - PANEL;
  const innerHeight = innerTop - innerBottom;

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
      [0, PLINTH_HEIGHT + PANEL / 2, carcassCenterZ],
      body,
    ),
  );

  cabinet.add(
    createPanel(
      'plinth',
      [innerWidth, PLINTH_HEIGHT, PANEL],
      [0, PLINTH_HEIGHT / 2, carcassFrontZ - PLINTH_INSET - PANEL / 2],
      body,
    ),
  );

  cabinet.add(
    createPanel(
      'back',
      [innerWidth, innerHeight, BACK],
      [0, innerBottom + innerHeight / 2, backZ + BACK / 2],
      body,
    ),
  );

  const shelfCount = Math.max(0, Math.round(innerHeight / SHELF_STEP) - 1);
  const shelfDepth = carcassDepth - BACK - SHELF_SETBACK;
  for (let i = 1; i <= shelfCount; i += 1) {
    cabinet.add(
      createPanel(
        `shelf-${i}`,
        [innerWidth, PANEL, shelfDepth],
        [
          0,
          innerBottom + (innerHeight * i) / (shelfCount + 1),
          backZ + BACK + shelfDepth / 2,
        ],
        body,
      ),
    );
  }

  const doorHeight = H - PLINTH_HEIGHT - 2 * DOOR_REVEAL;
  const doorCenterY = PLINTH_HEIGHT + DOOR_REVEAL + doorHeight / 2;
  const common = {
    height: doorHeight,
    centerY: doorCenterY,
    frontZ: D / 2,
    materials,
    body,
  };

  const doors =
    dimensions.width >= DOUBLE_DOOR_FROM_WIDTH
      ? [
          createDoor({
            ...common,
            key: 'left',
            hingeX: -W / 2 + DOOR_REVEAL,
            sign: -1,
            width: (W - 2 * DOOR_REVEAL - DOORS_CENTER_GAP) / 2,
          }),
          createDoor({
            ...common,
            key: 'right',
            hingeX: W / 2 - DOOR_REVEAL,
            sign: 1,
            width: (W - 2 * DOOR_REVEAL - DOORS_CENTER_GAP) / 2,
          }),
        ]
      : [
          createDoor({
            ...common,
            key: 'left',
            hingeX: -W / 2 + DOOR_REVEAL,
            sign: -1,
            width: W - 2 * DOOR_REVEAL,
          }),
        ];

  doors.forEach((pivot) => cabinet.add(pivot));
  cabinet.userData.doors = doors;

  return cabinet;
}
