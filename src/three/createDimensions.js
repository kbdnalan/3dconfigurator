import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MM } from './createCabinet.js';

const OFFSET = 80 * MM; // насколько размерная линия отнесена от тумбы
const GAP = 10 * MM; // зазор между тумбой и началом выносной линии
const OVERSHOOT = 15 * MM; // выносная линия чуть заходит за размерную
const TICK = 16 * MM; // длина засечки на концах размерной линии

/** Создаёт HTML-подпись, которая «приклеена» к точке в 3D-пространстве. */
function createLabel(text, position) {
  const element = document.createElement('div');
  element.className = 'dim-label';
  element.textContent = text;
  const label = new CSS2DObject(element);
  label.position.copy(position);
  return label;
}

/**
 * Добавляет в массив points отрезки одной размерной линии:
 * две выносные линии, основную линию и две косые засечки.
 * start, end — точки на тумбе; direction — куда выносим линию (единичный вектор).
 */
function addDimensionSegments(points, start, end, direction) {
  const offset = direction.clone().multiplyScalar(OFFSET);
  const lineStart = start.clone().add(offset);
  const lineEnd = end.clone().add(offset);

  // Выносные линии от тумбы до размерной линии
  [start, end].forEach((point) => {
    points.push(
      point.clone().addScaledVector(direction, GAP),
      point.clone().addScaledVector(direction, OFFSET + OVERSHOOT),
    );
  });

  // Основная размерная линия
  points.push(lineStart, lineEnd);

  // Засечки под 45° — как на мебельных чертежах
  const along = lineEnd.clone().sub(lineStart).normalize();
  const tick = along
    .add(direction)
    .normalize()
    .multiplyScalar(TICK / 2);
  [lineStart, lineEnd].forEach((point) => {
    points.push(point.clone().sub(tick), point.clone().add(tick));
  });

  return lineStart.clone().lerp(lineEnd, 0.5); // середина — место для подписи
}

/**
 * Создаёт группу с размерными линиями и подписями для текущих размеров (в мм).
 */
export function createDimensions(dimensions, lineMaterial) {
  const W = dimensions.width * MM;
  const H = dimensions.height * MM;
  const D = dimensions.depth * MM;
  const points = [];

  const group = new THREE.Group();
  group.name = 'dimensions';

  // Ширина — над верхней передней кромкой
  const widthMid = addDimensionSegments(
    points,
    new THREE.Vector3(-W / 2, H, D / 2),
    new THREE.Vector3(W / 2, H, D / 2),
    new THREE.Vector3(0, 1, 0),
  );
  group.add(createLabel(`${dimensions.width} мм`, widthMid));

  // Высота — слева от передней левой кромки
  const heightMid = addDimensionSegments(
    points,
    new THREE.Vector3(-W / 2, 0, D / 2),
    new THREE.Vector3(-W / 2, H, D / 2),
    new THREE.Vector3(-1, 0, 0),
  );
  group.add(createLabel(`${dimensions.height} мм`, heightMid));

  // Глубина — справа от верхней правой кромки
  const depthMid = addDimensionSegments(
    points,
    new THREE.Vector3(W / 2, H, D / 2),
    new THREE.Vector3(W / 2, H, -D / 2),
    new THREE.Vector3(1, 0, 0),
  );
  group.add(createLabel(`${dimensions.depth} мм`, depthMid));

  // Все отрезки — в одной геометрии: это быстрее, чем много отдельных линий
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const lines = new THREE.LineSegments(geometry, lineMaterial);
  lines.renderOrder = 1;
  group.add(lines);

  return group;
}
