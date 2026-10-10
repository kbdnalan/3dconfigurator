import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Перевод миллиметров в метры: 1 единица сцены = 1 метр
export const MM = 0.001;

// Толщины деталей — как у реальной мебели из ЛДСП
const PANEL = 18 * MM; // корпус: бока, верх, низ
const BACK = 6 * MM; // задняя стенка (тонкая плита ХДФ)
const DOOR = 18 * MM; // дверца
const DOOR_REVEAL = 2 * MM; // зазор по краю дверцы (как у настоящей мебели)
const DOOR_CLEARANCE = 1 * MM; // зазор между дверцей и корпусом

// Ограничивает число диапазоном [min, max]
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Создаёт деталь-коробку и ставит её так, чтобы её ЦЕНТР оказался в точке (x, y, z). */
function createPanel(name, size, position, material, rounded = false) {
  const [sx, sy, sz] = size;
  const geometry = rounded
    ? new RoundedBoxGeometry(sx, sy, sz, 2, 1.5 * MM) // слегка скруглённые кромки
    : new THREE.BoxGeometry(sx, sy, sz);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.part = 'body'; // признак: эта деталь перекрашивается при смене материала
  return mesh;
}

/** Ручка-скоба: вертикальный стержень на двух стойках. */
function createHandle(doorWidth, doorHeight, material) {
  const group = new THREE.Group();
  group.name = 'handle';

  // Длина ручки зависит от высоты дверцы, но в разумных пределах
  const length = clamp(doorHeight * 0.18, 70 * MM, 200 * MM);
  const barRadius = 5 * MM;
  const postRadius = 3.5 * MM;
  const postLength = 22 * MM;

  // Вертикальный стержень
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(barRadius, barRadius, length, 24),
    material,
  );
  bar.position.z = postLength + barRadius;

  // Две стойки, которые крепят стержень к дверце (повёрнуты вдоль оси Z)
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

  // Ручку ставим у правого края дверцы, в верхней части (петли — слева)
  const sideInset = clamp(doorWidth * 0.08, 35 * MM, 60 * MM);
  const topInset = clamp(doorHeight * 0.08, 40 * MM, 100 * MM);
  group.position.set(
    doorWidth / 2 - sideInset,
    doorHeight / 2 - topInset - length / 2,
    DOOR / 2,
  );
  return group;
}

/**
 * Собирает тумбу из деталей.
 * dimensions — размеры в мм { width, height, depth } — это ГАБАРИТЫ тумбы с дверцей.
 * Начало координат: центр тумбы на уровне пола. Передняя сторона смотрит на +Z.
 */
export function createCabinet(dimensions, materials, materialKey) {
  const W = dimensions.width * MM;
  const H = dimensions.height * MM;
  const D = dimensions.depth * MM;
  const body = materials.body[materialKey];

  // Глубина корпуса = общая глубина минус дверца и небольшой зазор
  const carcassDepth = D - DOOR - DOOR_CLEARANCE;
  const backZ = -D / 2; // задняя плоскость тумбы
  const carcassCenterZ = backZ + carcassDepth / 2;
  const innerWidth = W - 2 * PANEL; // расстояние между боковинами

  const cabinet = new THREE.Group();
  cabinet.name = 'cabinet';

  // Верхняя панель лежит НА боковинах и закрывает их торцы сверху
  cabinet.add(
    createPanel(
      'top',
      [W, PANEL, carcassDepth],
      [0, H - PANEL / 2, carcassCenterZ],
      body,
    ),
  );

  // Боковые стенки стоят на полу и доходят до верхней панели
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

  // Нижняя панель — между боковинами, у пола
  cabinet.add(
    createPanel(
      'bottom',
      [innerWidth, PANEL, carcassDepth],
      [0, PANEL / 2, carcassCenterZ],
      body,
    ),
  );

  // Задняя стенка — между боковинами, между низом и верхом, у задней плоскости
  const backHeight = H - 2 * PANEL;
  cabinet.add(
    createPanel(
      'back',
      [innerWidth, backHeight, BACK],
      [0, PANEL + backHeight / 2, backZ + BACK / 2],
      body,
    ),
  );

  // Накладная дверца закрывает весь фасад, по краям — тонкий технологический зазор
  const doorWidth = W - 2 * DOOR_REVEAL;
  const doorHeight = H - 2 * DOOR_REVEAL;

  // Шарнир (pivot) — пустая группа на оси петли: левый задний край дверцы.
  // Three.js вращает объект вокруг его собственного начала координат,
  // поэтому, поворачивая шарнир, мы вращаем дверцу вокруг петли, а не вокруг центра.
  const doorPivot = new THREE.Group();
  doorPivot.name = 'door-pivot';
  doorPivot.position.set(-doorWidth / 2, 0, D / 2 - DOOR);

  // Внутри шарнира дверца сдвинута так, что её левый задний край совпадает с петлёй.
  // В закрытом положении передняя плоскость дверцы = передняя граница габарита.
  const door = createPanel(
    'door',
    [doorWidth, doorHeight, DOOR],
    [doorWidth / 2, H / 2, DOOR / 2],
    body,
    true,
  );
  // Ручка — дочерний объект дверцы: её координаты считаются от центра дверцы
  door.add(createHandle(doorWidth, doorHeight, materials.handle));
  doorPivot.add(door);
  cabinet.add(doorPivot);

  // Сохраняем ссылку на шарнир, чтобы SceneManager мог открывать дверцу
  cabinet.userData.doorPivot = doorPivot;

  return cabinet;
}
