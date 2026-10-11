import * as THREE from 'three';
import { MM } from './createCabinet.js';

export const ROOM_HEIGHT = 2.7;
export const WALL_CLEARANCE = 30 * MM;

const MIN_ROOM_WIDTH = 4.4;
const MIN_ROOM_DEPTH = 4.8;
const WALL = 0.12;
const BASEBOARD_HEIGHT = 70 * MM;
const BASEBOARD_DEPTH = 12 * MM;
const WINDOW = { width: 1.6, sill: 0.85, height: 1.5 };
const FRAME = 0.06;
const FRAME_DEPTH = 0.07;
const SASH = 0.045;
const GLASS = 6 * MM;
const SILL_OVERHANG = 0.08;
const CORD_LENGTH = 0.3;

const roundUp = (value) => Math.ceil(value * 10) / 10;

export function getRoomSize(widthMm, depthMm) {
  return {
    width: roundUp(Math.max(MIN_ROOM_WIDTH, widthMm * MM * 2 + 2.4)),
    depth: roundUp(Math.max(MIN_ROOM_DEPTH, depthMm * MM * 2 + 2.6)),
  };
}

function box(size, position, material, castShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function createWindowWall(materials, width, depth) {
  const group = new THREE.Group();
  const z0 = -WINDOW.width / 2;
  const z1 = WINDOW.width / 2;
  const y0 = WINDOW.sill;
  const y1 = WINDOW.sill + WINDOW.height;
  const openingHeight = y1 - y0;
  const yMid = (y0 + y1) / 2;

  const outline = new THREE.Shape()
    .moveTo(-depth / 2, 0)
    .lineTo(depth / 2, 0)
    .lineTo(depth / 2, ROOM_HEIGHT)
    .lineTo(-depth / 2, ROOM_HEIGHT)
    .closePath();
  outline.holes.push(
    new THREE.Path()
      .moveTo(z0, y0)
      .lineTo(z0, y1)
      .lineTo(z1, y1)
      .lineTo(z1, y0)
      .closePath(),
  );
  const wallGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: WALL,
    bevelEnabled: false,
  });
  wallGeometry.rotateY(Math.PI / 2);
  wallGeometry.translate(-width / 2 - WALL, 0, 0);
  const wall = new THREE.Mesh(wallGeometry, materials.wall);
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  const frameX = -width / 2 - WALL * 0.6;
  const frame = materials.frame;
  const transomY = y0 + openingHeight * 0.7;
  group.add(
    box([FRAME_DEPTH, FRAME, WINDOW.width], [frameX, y1 - FRAME / 2, 0], frame),
    box([FRAME_DEPTH, FRAME, WINDOW.width], [frameX, y0 + FRAME / 2, 0], frame),
    box([FRAME_DEPTH, openingHeight, FRAME], [frameX, yMid, z0 + FRAME / 2], frame),
    box([FRAME_DEPTH, openingHeight, FRAME], [frameX, yMid, z1 - FRAME / 2], frame),
    box([FRAME_DEPTH, transomY - y0, SASH], [frameX, (y0 + transomY) / 2, 0], frame),
    box([FRAME_DEPTH, SASH, WINDOW.width], [frameX, transomY, 0], frame),
  );

  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(GLASS, openingHeight - FRAME, WINDOW.width - FRAME),
    materials.glass,
  );
  glass.position.set(frameX, yMid, 0);
  group.add(glass);

  const sillDepth = WALL + SILL_OVERHANG;
  group.add(
    box(
      [sillDepth, 0.03, WINDOW.width + 0.12],
      [-width / 2 - WALL + sillDepth / 2, y0 - 0.015, 0],
      materials.baseboard,
    ),
  );

  const sky = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), materials.sky);
  sky.position.set(-width / 2 - WALL - 2.5, 1.6, 0);
  sky.rotation.y = Math.PI / 2;
  group.add(sky);

  const windowLight = new THREE.RectAreaLight('#ffffff', 0, WINDOW.width, WINDOW.height);
  windowLight.position.set(-width / 2 + 0.01, yMid, 0);
  windowLight.lookAt(0, yMid, 0);
  group.add(windowLight);

  return { group, windowLight };
}

function createLamp(materials) {
  const lamp = new THREE.Group();

  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, CORD_LENGTH, 8),
    materials.lampShade,
  );
  cord.position.y = -CORD_LENGTH / 2;
  lamp.add(cord);

  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.22, 0.2, 40, 1, true),
    materials.lampShade,
  );
  shade.position.y = -CORD_LENGTH - 0.1;
  shade.castShadow = true;
  lamp.add(shade);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), materials.bulb);
  bulb.position.y = -CORD_LENGTH - 0.13;
  lamp.add(bulb);

  const light = new THREE.PointLight('#ffcf94', 0, 0, 2);
  light.position.y = -CORD_LENGTH - 0.16;
  light.castShadow = true;
  light.shadow.radius = 8;
  light.shadow.intensity = 0.75;
  light.shadow.bias = -0.002;
  light.shadow.camera.near = 0.05;
  light.shadow.camera.far = 8;
  light.shadow.autoUpdate = false;
  lamp.add(light);

  lamp.position.y = ROOM_HEIGHT;
  return { lamp, light };
}

export function createRoom(materials, width, depth, shadowMapSize) {
  const room = new THREE.Group();
  room.name = 'room';
  const outerWidth = width + 2 * WALL;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.0005;
  floor.receiveShadow = true;
  room.add(floor);

  room.add(
    box(
      [outerWidth, WALL, depth + 2 * WALL],
      [0, ROOM_HEIGHT + WALL / 2, 0],
      materials.ceiling,
    ),
    box(
      [outerWidth, ROOM_HEIGHT, WALL],
      [0, ROOM_HEIGHT / 2, -depth / 2 - WALL / 2],
      materials.wall,
    ),
    box(
      [outerWidth, ROOM_HEIGHT, WALL],
      [0, ROOM_HEIGHT / 2, depth / 2 + WALL / 2],
      materials.wall,
    ),
    box(
      [WALL, ROOM_HEIGHT, depth],
      [width / 2 + WALL / 2, ROOM_HEIGHT / 2, 0],
      materials.wall,
    ),
  );

  const { group: windowWall, windowLight } = createWindowWall(materials, width, depth);
  room.add(windowWall);

  const sideLength = depth - 2 * BASEBOARD_DEPTH;
  const boards = [
    [
      [width, BASEBOARD_HEIGHT, BASEBOARD_DEPTH],
      [0, -depth / 2 + BASEBOARD_DEPTH / 2],
    ],
    [
      [width, BASEBOARD_HEIGHT, BASEBOARD_DEPTH],
      [0, depth / 2 - BASEBOARD_DEPTH / 2],
    ],
    [
      [BASEBOARD_DEPTH, BASEBOARD_HEIGHT, sideLength],
      [width / 2 - BASEBOARD_DEPTH / 2, 0],
    ],
    [
      [BASEBOARD_DEPTH, BASEBOARD_HEIGHT, sideLength],
      [-width / 2 + BASEBOARD_DEPTH / 2, 0],
    ],
  ];
  boards.forEach(([size, [x, z]]) => {
    room.add(box(size, [x, BASEBOARD_HEIGHT / 2, z], materials.baseboard, false));
  });

  const { lamp, light } = createLamp(materials);
  light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  room.add(lamp);

  room.userData = {
    width,
    depth,
    lampLight: light,
    windowLight,
    innerLimit: { x: width / 2 - BASEBOARD_DEPTH, z: depth / 2 - BASEBOARD_DEPTH },
  };
  return room;
}
