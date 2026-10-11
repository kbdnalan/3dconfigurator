import * as THREE from 'three';
import { MM } from './createCabinet.js';

export const ROOM_WIDTH = 3.8;
export const ROOM_DEPTH = 4.4;
export const ROOM_HEIGHT = 2.7;
export const WALL_GAP = 20 * MM;

const WALL = 0.12;
const BASEBOARD_HEIGHT = 70 * MM;
const BASEBOARD_DEPTH = 12 * MM;
const WINDOW = { start: 0.15, width: 1.3, sill: 0.85, height: 1.45 };
const FRAME = 0.06;
const FRAME_DEPTH = 0.07;
const SILL_OVERHANG = 0.08;

function box(size, position, material, castShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

function createWindowWall(materials) {
  const group = new THREE.Group();
  const x = -ROOM_WIDTH / 2 - WALL / 2;
  const z0 = WINDOW.start;
  const z1 = WINDOW.start + WINDOW.width;
  const y0 = WINDOW.sill;
  const y1 = WINDOW.sill + WINDOW.height;
  const openingHeight = y1 - y0;

  group.add(box([WALL, y0, ROOM_DEPTH], [x, y0 / 2, ROOM_DEPTH / 2], materials.wall));
  group.add(
    box(
      [WALL, ROOM_HEIGHT - y1, ROOM_DEPTH],
      [x, (y1 + ROOM_HEIGHT) / 2, ROOM_DEPTH / 2],
      materials.wall,
    ),
  );
  group.add(box([WALL, openingHeight, z0], [x, (y0 + y1) / 2, z0 / 2], materials.wall));
  group.add(
    box(
      [WALL, openingHeight, ROOM_DEPTH - z1],
      [x, (y0 + y1) / 2, (z1 + ROOM_DEPTH) / 2],
      materials.wall,
    ),
  );

  const frameX = -ROOM_WIDTH / 2 - WALL * 0.6;
  const zMid = (z0 + z1) / 2;
  const yMid = (y0 + y1) / 2;
  const frame = materials.frame;
  group.add(
    box([FRAME_DEPTH, FRAME, WINDOW.width], [frameX, y1 - FRAME / 2, zMid], frame),
  );
  group.add(
    box([FRAME_DEPTH, FRAME, WINDOW.width], [frameX, y0 + FRAME / 2, zMid], frame),
  );
  group.add(
    box([FRAME_DEPTH, openingHeight, FRAME], [frameX, yMid, z0 + FRAME / 2], frame),
  );
  group.add(
    box([FRAME_DEPTH, openingHeight, FRAME], [frameX, yMid, z1 - FRAME / 2], frame),
  );
  group.add(box([FRAME_DEPTH * 0.8, openingHeight, 0.045], [frameX, yMid, zMid], frame));
  group.add(
    box(
      [FRAME_DEPTH * 0.8, 0.045, WINDOW.width],
      [frameX, y0 + openingHeight * 0.68, zMid],
      frame,
    ),
  );

  const sillDepth = WALL + SILL_OVERHANG;
  group.add(
    box(
      [sillDepth, 0.03, WINDOW.width + 0.12],
      [-ROOM_WIDTH / 2 - WALL + sillDepth / 2, y0 - 0.015, zMid],
      materials.baseboard,
    ),
  );

  return group;
}

function createLamp(materials) {
  const lamp = new THREE.Group();
  const cordLength = 0.45;

  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, cordLength, 8),
    materials.lampShade,
  );
  cord.position.y = -cordLength / 2;
  lamp.add(cord);

  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.22, 0.2, 40, 1, true),
    materials.lampShade,
  );
  shade.position.y = -cordLength - 0.1;
  shade.castShadow = true;
  lamp.add(shade);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16), materials.bulb);
  bulb.position.y = -cordLength - 0.13;
  lamp.add(bulb);

  const light = new THREE.PointLight('#ffcf94', 0, 0, 2);
  light.position.y = -cordLength - 0.16;
  lamp.add(light);

  lamp.position.set(0, ROOM_HEIGHT, ROOM_DEPTH * 0.45);
  return { lamp, light };
}

export function createRoom(materials) {
  const room = new THREE.Group();
  room.name = 'room';
  const outerWidth = ROOM_WIDTH + 2 * WALL;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    materials.floor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.0005, ROOM_DEPTH / 2);
  floor.receiveShadow = true;
  room.add(floor);

  room.add(
    box(
      [outerWidth, WALL, ROOM_DEPTH + 2 * WALL],
      [0, ROOM_HEIGHT + WALL / 2, ROOM_DEPTH / 2],
      materials.ceiling,
    ),
  );
  room.add(
    box([outerWidth, ROOM_HEIGHT, WALL], [0, ROOM_HEIGHT / 2, -WALL / 2], materials.wall),
  );
  room.add(
    box(
      [outerWidth, ROOM_HEIGHT, WALL],
      [0, ROOM_HEIGHT / 2, ROOM_DEPTH + WALL / 2],
      materials.wall,
    ),
  );
  room.add(
    box(
      [WALL, ROOM_HEIGHT, ROOM_DEPTH],
      [ROOM_WIDTH / 2 + WALL / 2, ROOM_HEIGHT / 2, ROOM_DEPTH / 2],
      materials.wall,
    ),
  );
  room.add(createWindowWall(materials));

  const sideLength = ROOM_DEPTH - 2 * BASEBOARD_DEPTH;
  const boards = [
    [
      [ROOM_WIDTH, BASEBOARD_HEIGHT, BASEBOARD_DEPTH],
      [0, BASEBOARD_DEPTH / 2],
    ],
    [
      [ROOM_WIDTH, BASEBOARD_HEIGHT, BASEBOARD_DEPTH],
      [0, ROOM_DEPTH - BASEBOARD_DEPTH / 2],
    ],
    [
      [BASEBOARD_DEPTH, BASEBOARD_HEIGHT, sideLength],
      [ROOM_WIDTH / 2 - BASEBOARD_DEPTH / 2, ROOM_DEPTH / 2],
    ],
    [
      [BASEBOARD_DEPTH, BASEBOARD_HEIGHT, sideLength],
      [-ROOM_WIDTH / 2 + BASEBOARD_DEPTH / 2, ROOM_DEPTH / 2],
    ],
  ];
  boards.forEach(([size, [x, z]]) => {
    room.add(box(size, [x, BASEBOARD_HEIGHT / 2, z], materials.baseboard, false));
  });

  const { lamp, light } = createLamp(materials);
  room.add(lamp);

  room.userData = { lampLight: light };
  return room;
}
