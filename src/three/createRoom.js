import * as THREE from 'three';
import { MM } from './createCabinet.js';

export const ROOM_SIZE = 30;
const ROOM_HEIGHT = 2.8;
const WALL_GAP = 20 * MM;
const BASEBOARD_HEIGHT = 70 * MM;
const BASEBOARD_DEPTH = 12 * MM;

function createWall(width, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, ROOM_HEIGHT), material);
  wall.position.y = ROOM_HEIGHT / 2;
  wall.receiveShadow = true;
  return wall;
}

function createBaseboard(length, material) {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(length, BASEBOARD_HEIGHT, BASEBOARD_DEPTH),
    material,
  );
  board.position.set(0, BASEBOARD_HEIGHT / 2, BASEBOARD_DEPTH / 2);
  board.castShadow = true;
  board.receiveShadow = true;
  return board;
}

function createWallSide(length, materials, boardOffset) {
  const side = new THREE.Group();
  side.add(createWall(length, materials.wall));
  const board = createBaseboard(length - boardOffset, materials.baseboard);
  board.position.x = -boardOffset / 2;
  side.add(board);
  return side;
}

export function createRoom(dimensions, materials) {
  const W = dimensions.width * MM;
  const D = dimensions.depth * MM;
  const backZ = -D / 2 - WALL_GAP;
  const leftX = -W / 2 - (0.45 + W * 0.2);

  const room = new THREE.Group();
  room.name = 'room';

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_SIZE * 2, ROOM_SIZE * 2),
    materials.floor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.0005;
  floor.receiveShadow = true;
  room.add(floor);

  const backSide = createWallSide(ROOM_SIZE, materials, 0);
  backSide.position.set(leftX + ROOM_SIZE / 2, 0, backZ);
  room.add(backSide);

  const leftSide = createWallSide(ROOM_SIZE, materials, BASEBOARD_DEPTH);
  leftSide.rotation.y = Math.PI / 2;
  leftSide.position.set(leftX, 0, backZ + ROOM_SIZE / 2);
  room.add(leftSide);

  room.userData = { backSide, leftSide, backZ, leftX };
  return room;
}
