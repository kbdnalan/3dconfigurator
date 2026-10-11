import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MM } from './createCabinet.js';

const OFFSET = 80 * MM;
const GAP = 10 * MM;
const OVERSHOOT = 15 * MM;
const TICK = 16 * MM;

function createLabel(axis, value, position) {
  const element = document.createElement('div');
  element.className = 'dim-label';
  const key = document.createElement('span');
  key.className = 'dim-key';
  key.textContent = axis;
  const text = document.createElement('span');
  text.textContent = `${value} мм`;
  element.append(key, text);
  const label = new CSS2DObject(element);
  label.position.copy(position);
  return label;
}

function addDimensionSegments(points, start, end, direction) {
  const offset = direction.clone().multiplyScalar(OFFSET);
  const lineStart = start.clone().add(offset);
  const lineEnd = end.clone().add(offset);

  [start, end].forEach((point) => {
    points.push(
      point.clone().addScaledVector(direction, GAP),
      point.clone().addScaledVector(direction, OFFSET + OVERSHOOT),
    );
  });

  points.push(lineStart, lineEnd);

  const along = lineEnd.clone().sub(lineStart).normalize();
  const tick = along
    .add(direction)
    .normalize()
    .multiplyScalar(TICK / 2);
  [lineStart, lineEnd].forEach((point) => {
    points.push(point.clone().sub(tick), point.clone().add(tick));
  });

  return lineStart.clone().lerp(lineEnd, 0.5);
}

export function createDimensions(dimensions, lineMaterial) {
  const W = dimensions.width * MM;
  const H = dimensions.height * MM;
  const D = dimensions.depth * MM;
  const points = [];

  const group = new THREE.Group();
  group.name = 'dimensions';

  const widthMid = addDimensionSegments(
    points,
    new THREE.Vector3(-W / 2, H, D / 2),
    new THREE.Vector3(W / 2, H, D / 2),
    new THREE.Vector3(0, 1, 0),
  );
  group.add(createLabel('Ш', dimensions.width, widthMid));

  const heightMid = addDimensionSegments(
    points,
    new THREE.Vector3(-W / 2, 0, D / 2),
    new THREE.Vector3(-W / 2, H, D / 2),
    new THREE.Vector3(-1, 0, 0),
  );
  group.add(createLabel('В', dimensions.height, heightMid));

  const depthMid = addDimensionSegments(
    points,
    new THREE.Vector3(W / 2, H, D / 2),
    new THREE.Vector3(W / 2, H, -D / 2),
    new THREE.Vector3(1, 0, 0),
  );
  group.add(createLabel('Г', dimensions.depth, depthMid));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const lines = new THREE.LineSegments(geometry, lineMaterial);
  lines.renderOrder = 1;
  group.add(lines);

  return group;
}
