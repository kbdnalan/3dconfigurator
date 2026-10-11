import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  BACK,
  DRAWER_WALL,
  FRONT,
  PANEL,
  PLINTH_HEIGHT,
  PLINTH_INSET,
  ROD_DIAMETER,
  getCabinetLayout,
} from '../utils/cabinetLayout.js';

export const MM = 0.001;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createPanel(name, size, position, material, rounded = false) {
  const [sx, sy, sz] = size.map((v) => v * MM);
  const geometry = rounded
    ? new RoundedBoxGeometry(sx, sy, sz, 2, 1.5 * MM)
    : new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position.map((v) => v * MM));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.part = 'body';
  return mesh;
}

function createHandle(lengthMm, material) {
  const group = new THREE.Group();
  group.name = 'handle';

  const length = lengthMm * MM;
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
  return group;
}

function createDoor(door, frontZ, materials, body) {
  const { key, hingeX, sign, width, height, centerY } = door;
  const pivot = new THREE.Group();
  pivot.name = `door-${key}`;
  pivot.position.set(hingeX * MM, 0, (frontZ - FRONT) * MM);

  const panel = createPanel(
    `door-${key}`,
    [width, height, FRONT],
    [(-sign * width) / 2, centerY, FRONT / 2],
    body,
    true,
  );
  const handle = createHandle(clamp(height * 0.18, 70, 200), materials.handle);
  const sideInset = clamp(width * 0.08, 35, 60);
  handle.position.set(-sign * (width / 2 - sideInset) * MM, 0, (FRONT / 2) * MM);
  panel.add(handle);
  pivot.add(panel);

  pivot.userData = {
    key: `door-${key}`,
    type: 'door',
    sign,
    hingeX: hingeX * MM,
    width: width * MM,
  };
  return pivot;
}

function createDrawer(drawer, box, frontZ, materials, body) {
  const { index, width, height, centerY } = drawer;
  const group = new THREE.Group();
  group.name = `drawer-${index}`;
  group.position.set(0, centerY * MM, (frontZ - FRONT / 2) * MM);

  group.add(createPanel('drawer-front', [width, height, FRONT], [0, 0, 0], body, true));

  const handle = createHandle(clamp(width * 0.3, 100, 320), materials.handle);
  handle.rotation.z = Math.PI / 2;
  handle.position.z = (FRONT / 2) * MM;
  group.add(handle);

  const boxBack = -FRONT / 2 - box.depth;
  const boxCenterZ = -FRONT / 2 - box.depth / 2;
  const boxBottom = -height / 2 + 20;
  const boxCenterY = boxBottom + box.height / 2;
  const sideX = box.width / 2 - DRAWER_WALL / 2;
  const innerBoxWidth = box.width - 2 * DRAWER_WALL;
  group.add(
    createPanel(
      'drawer-side',
      [DRAWER_WALL, box.height, box.depth],
      [-sideX, boxCenterY, boxCenterZ],
      body,
    ),
    createPanel(
      'drawer-side',
      [DRAWER_WALL, box.height, box.depth],
      [sideX, boxCenterY, boxCenterZ],
      body,
    ),
    createPanel(
      'drawer-back',
      [innerBoxWidth, box.height, DRAWER_WALL],
      [0, boxCenterY, boxBack + DRAWER_WALL / 2],
      body,
    ),
    createPanel(
      'drawer-bottom',
      [innerBoxWidth, 8, box.depth - DRAWER_WALL],
      [0, boxBottom + 4, boxCenterZ + DRAWER_WALL / 2],
      body,
    ),
  );

  group.userData = {
    key: `drawer-${index}`,
    type: 'drawer',
    closedZ: group.position.z,
    travel: box.depth * 0.75 * MM,
  };
  return group;
}

function createRod(rod, materials) {
  const group = new THREE.Group();
  group.name = 'rod';
  const radius = (ROD_DIAMETER / 2) * MM;

  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, rod.length * MM, 24),
    materials.handle,
  );
  bar.rotation.z = Math.PI / 2;
  group.add(bar);

  const holderGeometry = new THREE.CylinderGeometry(
    radius * 1.8,
    radius * 1.8,
    8 * MM,
    24,
  );
  holderGeometry.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    const holder = new THREE.Mesh(holderGeometry, materials.handle);
    holder.position.x = side * (rod.length / 2 - 4) * MM;
    group.add(holder);
  }

  group.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  group.position.set(0, rod.y * MM, rod.z * MM);
  return group;
}

export function createCabinet(dimensions, construction, materials, materialKey) {
  const layout = getCabinetLayout(dimensions, construction);
  const { W, H, D, carcassDepth, backZ, innerWidth, innerBottom, innerHeight } = layout;
  const body = materials.body[materialKey];
  const carcassFrontZ = backZ + carcassDepth;
  const carcassCenterZ = backZ + carcassDepth / 2;
  const sideHeight = H - PANEL;
  const sideX = W / 2 - PANEL / 2;

  const cabinet = new THREE.Group();
  cabinet.name = 'cabinet';

  cabinet.add(
    createPanel(
      'top',
      [W, PANEL, carcassDepth],
      [0, H - PANEL / 2, carcassCenterZ],
      body,
    ),
    createPanel(
      'side-left',
      [PANEL, sideHeight, carcassDepth],
      [-sideX, sideHeight / 2, carcassCenterZ],
      body,
    ),
    createPanel(
      'side-right',
      [PANEL, sideHeight, carcassDepth],
      [sideX, sideHeight / 2, carcassCenterZ],
      body,
    ),
    createPanel(
      'bottom',
      [innerWidth, PANEL, carcassDepth],
      [0, PLINTH_HEIGHT + PANEL / 2, carcassCenterZ],
      body,
    ),
    createPanel(
      'plinth',
      [innerWidth, PLINTH_HEIGHT, PANEL],
      [0, PLINTH_HEIGHT / 2, carcassFrontZ - PLINTH_INSET - PANEL / 2],
      body,
    ),
    createPanel(
      'back',
      [innerWidth, innerHeight, BACK],
      [0, innerBottom + innerHeight / 2, backZ + BACK / 2],
      body,
    ),
  );

  layout.shelves.forEach((y, i) => {
    cabinet.add(
      createPanel(
        `shelf-${i + 1}`,
        [innerWidth, PANEL, layout.shelfDepth],
        [0, y, backZ + BACK + layout.shelfDepth / 2],
        body,
      ),
    );
  });

  if (layout.rod) cabinet.add(createRod(layout.rod, materials));

  const movables = [
    ...layout.doors.map((door) => createDoor(door, D / 2, materials, body)),
    ...layout.drawers.map((drawer) =>
      createDrawer(drawer, layout.drawerBox, D / 2, materials, body),
    ),
  ];
  movables.forEach((part) => cabinet.add(part));
  cabinet.userData.movables = movables;
  return cabinet;
}
