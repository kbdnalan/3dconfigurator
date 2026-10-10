import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MM } from './createCabinet.js';

const OFFSET = 80 * MM;
const GAP = 10 * MM;
const OVERSHOOT = 15 * MM;
const TICK = 16 * MM;

function createLabel(text, position) {
  const element = document.createElement('div');
  element.className = 'dim-label';
  element.textContent = text;
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
  group.add(createLabel(`${dimensions.width} мм`, widthMid));

  const heightMid = addDimensionSegments(
    points,
    new THREE.Vector3(-W / 2, 0, D / 2),
    new THREE.Vector3(-W / 2, H, D / 2),
    new THREE.Vector3(-1, 0, 0),
  );
  group.add(createLabel(`${dimensions.height} мм`, heightMid));

  const depthMid = addDimensionSegments(
    points,
    new THREE.Vector3(W / 2, H, D / 2),
    new THREE.Vector3(W / 2, H, -D / 2),
    new THREE.Vector3(1, 0, 0),
  );
  group.add(createLabel(`${dimensions.depth} мм`, depthMid));

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const lines = new THREE.LineSegments(geometry, lineMaterial);
  lines.renderOrder = 1;
  group.add(lines);

  return group;
}
