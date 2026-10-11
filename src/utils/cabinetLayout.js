export const PANEL = 18;
export const BACK = 6;
export const FRONT = 18;
export const REVEAL = 2;
export const FRONT_CLEARANCE = 1;
export const FRONT_GAP = 3;
export const PLINTH_HEIGHT = 80;
export const PLINTH_INSET = 40;
export const SHELF_SETBACK = 20;
export const DRAWER_WALL = 12;
export const DRAWER_SLIDE_GAP = 13;
export const ROD_DIAMETER = 25;

const DOUBLE_DOOR_FROM_WIDTH = 800;
const MIN_SHELF_GAP = 180;
const MAX_SHELVES = 6;
const DRAWER_STEP = 200;
const MAX_DRAWERS = 6;
const MIN_ROD_INNER_HEIGHT = 400;
const ROD_TOP_OFFSET = 60;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value) => Math.round(value * 10) / 10;

function getInnerHeight(height) {
  return height - PLINTH_HEIGHT - 2 * PANEL;
}

export function canHaveRod(height) {
  return getInnerHeight(height) >= MIN_ROD_INNER_HEIGHT;
}

function getRodZone(innerHeight) {
  return clamp(innerHeight * 0.55, 300, 1100);
}

function getShelfRegion(height, rod) {
  const innerHeight = getInnerHeight(height);
  return rod && canHaveRod(height) ? innerHeight - getRodZone(innerHeight) : innerHeight;
}

export function getMaxShelves(height, rod = false) {
  const gaps = Math.floor(getShelfRegion(height, rod) / MIN_SHELF_GAP);
  return clamp(gaps - 1, 0, MAX_SHELVES);
}

export function clampShelves(shelves, height, rod = false) {
  return clamp(Math.round(shelves), 0, getMaxShelves(height, rod));
}

export function getDrawerCount(height) {
  return clamp(Math.round((height - PLINTH_HEIGHT) / DRAWER_STEP), 1, MAX_DRAWERS);
}

function getHingeCount(doorHeight) {
  if (doorHeight <= 900) return 2;
  if (doorHeight <= 1600) return 3;
  return 4;
}

/**
 * Полный расчёт тумбы в миллиметрах. По нему строится 3D-модель и спецификация.
 * Координаты: x — от центра, y — от пола, z — от центра по глубине (фасад на +z).
 */
export function getCabinetLayout(dimensions, construction) {
  const { width: W, height: H, depth: D } = dimensions;
  const { style } = construction;

  const carcassDepth = D - FRONT - FRONT_CLEARANCE;
  const backZ = -D / 2;
  const innerWidth = W - 2 * PANEL;
  const innerBottom = PLINTH_HEIGHT + PANEL;
  const innerTop = H - PANEL;
  const innerHeight = innerTop - innerBottom;
  const innerDepth = carcassDepth - BACK;

  const rod = style !== 'drawers' && construction.rod && canHaveRod(H);
  const shelfRegion = getShelfRegion(H, rod);
  const shelfCount = style === 'drawers' ? 0 : clampShelves(construction.shelves, H, rod);
  const shelfDepth = carcassDepth - BACK - SHELF_SETBACK;
  const shelves = Array.from(
    { length: shelfCount },
    (_, i) => innerBottom + (shelfRegion * (i + 1)) / (shelfCount + 1),
  );

  const frontHeight = H - PLINTH_HEIGHT - 2 * REVEAL;
  const frontCenterY = PLINTH_HEIGHT + REVEAL + frontHeight / 2;

  let doors = [];
  if (style === 'doors') {
    if (W < DOUBLE_DOOR_FROM_WIDTH) {
      doors = [{ key: 'left', sign: -1, hingeX: -W / 2 + REVEAL, width: W - 2 * REVEAL }];
    } else {
      const width = (W - 2 * REVEAL - FRONT_GAP) / 2;
      doors = [
        { key: 'left', sign: -1, hingeX: -W / 2 + REVEAL, width },
        { key: 'right', sign: 1, hingeX: W / 2 - REVEAL, width },
      ];
    }
    doors = doors.map((door) => ({
      ...door,
      height: frontHeight,
      centerY: frontCenterY,
    }));
  }

  let drawers = [];
  let drawerBox = null;
  if (style === 'drawers') {
    const count = getDrawerCount(H);
    const height = (frontHeight - (count - 1) * FRONT_GAP) / count;
    drawerBox = {
      width: innerWidth - 2 * DRAWER_SLIDE_GAP,
      depth: carcassDepth - BACK - 30,
      height: Math.min(height * 0.7, height - 50),
    };
    drawers = Array.from({ length: count }, (_, index) => ({
      index,
      width: W - 2 * REVEAL,
      height,
      centerY: PLINTH_HEIGHT + REVEAL + height / 2 + index * (height + FRONT_GAP),
    }));
  }

  const rodLayout = rod
    ? {
        length: innerWidth,
        y: innerTop - ROD_TOP_OFFSET,
        z: backZ + BACK + innerDepth / 2,
      }
    : null;

  const parts = [
    { name: 'Боковина', qty: 2, a: H - PANEL, b: carcassDepth, t: PANEL },
    { name: 'Крышка', qty: 1, a: W, b: carcassDepth, t: PANEL },
    { name: 'Дно', qty: 1, a: innerWidth, b: carcassDepth, t: PANEL },
    { name: 'Цоколь', qty: 1, a: innerWidth, b: PLINTH_HEIGHT, t: PANEL },
    { name: 'Задняя стенка (ХДФ)', qty: 1, a: innerWidth, b: innerHeight, t: BACK },
  ];
  if (shelfCount > 0) {
    parts.push({
      name: 'Полка',
      qty: shelfCount,
      a: innerWidth,
      b: shelfDepth,
      t: PANEL,
    });
  }
  if (doors.length) {
    parts.push({
      name: 'Дверца (фасад)',
      qty: doors.length,
      a: frontHeight,
      b: doors[0].width,
      t: FRONT,
    });
  }
  if (drawers.length) {
    const { width: bw, depth: bd, height: bh } = drawerBox;
    parts.push(
      {
        name: 'Фасад ящика',
        qty: drawers.length,
        a: drawers[0].width,
        b: drawers[0].height,
        t: FRONT,
      },
      { name: 'Боковина ящика', qty: drawers.length * 2, a: bd, b: bh, t: DRAWER_WALL },
      {
        name: 'Задняя стенка ящика',
        qty: drawers.length,
        a: bw - 2 * DRAWER_WALL,
        b: bh,
        t: DRAWER_WALL,
      },
      {
        name: 'Дно ящика (ХДФ)',
        qty: drawers.length,
        a: bw - 2 * DRAWER_WALL,
        b: bd - DRAWER_WALL,
        t: 8,
      },
    );
  }

  const hardware = [];
  const handles = doors.length + drawers.length;
  if (handles) hardware.push({ name: 'Ручка-скоба', qty: handles });
  if (doors.length) {
    hardware.push({
      name: 'Петля мебельная',
      qty: doors.length * getHingeCount(frontHeight),
    });
  }
  if (drawers.length) {
    hardware.push({
      name: `Направляющие ${Math.round(drawerBox.depth / 50) * 50} мм (пара)`,
      qty: drawers.length,
    });
  }
  if (shelfCount) hardware.push({ name: 'Полкодержатель', qty: shelfCount * 4 });
  if (rodLayout) {
    hardware.push(
      { name: `Штанга Ø${ROD_DIAMETER} мм, ${round(rodLayout.length)} мм`, qty: 1 },
      { name: 'Держатель штанги', qty: 2 },
    );
  }

  const area = parts.reduce(
    (sum, p) => (p.t === PANEL || p.t === FRONT ? sum + (p.qty * p.a * p.b) / 1e6 : sum),
    0,
  );

  return {
    W,
    H,
    D,
    style,
    carcassDepth,
    backZ,
    innerWidth,
    innerBottom,
    innerTop,
    innerHeight,
    innerDepth,
    shelfDepth,
    shelves,
    frontHeight,
    doors,
    drawers,
    drawerBox,
    rod: rodLayout,
    parts: parts.map((p) => ({ ...p, a: round(p.a), b: round(p.b) })),
    hardware,
    boardArea: Math.round(area * 100) / 100,
  };
}
