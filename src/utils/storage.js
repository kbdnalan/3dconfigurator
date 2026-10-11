import {
  CABINET_STYLES,
  DEFAULT_DIMENSIONS,
  DEFAULT_MATERIAL,
  DEFAULT_ROD,
  DEFAULT_SHELVES,
  DEFAULT_STYLE,
  DIMENSION_LIMITS,
  MATERIALS,
  TIME_OF_DAY,
} from '../config.js';

const STORAGE_KEY = 'cabinet-configurator:settings';
const VERSION = 1;
const MAX_PLACEMENT = 10;

export const DEFAULT_SETTINGS = {
  dimensions: DEFAULT_DIMENSIONS,
  construction: { style: DEFAULT_STYLE, shelves: DEFAULT_SHELVES, rod: DEFAULT_ROD },
  materialKey: DEFAULT_MATERIAL,
  timeOfDay: TIME_OF_DAY.initial,
  dimensionsVisible: true,
  placement: { x: 0, z: 0 },
};

function isNumberInRange(value, min, max) {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
  );
}

function readDimension(saved, key) {
  const value = saved?.dimensions?.[key];
  return isNumberInRange(value, DIMENSION_LIMITS.min, DIMENSION_LIMITS.max)
    ? Math.round(value)
    : DEFAULT_DIMENSIONS[key];
}

function readConstruction(saved) {
  const style = CABINET_STYLES.some((item) => item.key === saved?.construction?.style)
    ? saved.construction.style
    : DEFAULT_STYLE;
  const shelves = isNumberInRange(saved?.construction?.shelves, 0, 20)
    ? Math.round(saved.construction.shelves)
    : DEFAULT_SHELVES;
  const rod =
    typeof saved?.construction?.rod === 'boolean' ? saved.construction.rod : DEFAULT_ROD;
  return { style, shelves, rod };
}

function readPlacement(saved) {
  const read = (value) =>
    isNumberInRange(value, -MAX_PLACEMENT, MAX_PLACEMENT) ? value : 0;
  return { x: read(saved?.placement?.x), z: read(saved?.placement?.z) };
}

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw);
    if (saved?.version !== VERSION) return DEFAULT_SETTINGS;

    return {
      dimensions: {
        width: readDimension(saved, 'width'),
        height: readDimension(saved, 'height'),
        depth: readDimension(saved, 'depth'),
      },
      construction: readConstruction(saved),
      materialKey: MATERIALS.some((m) => m.key === saved.materialKey)
        ? saved.materialKey
        : DEFAULT_MATERIAL,
      timeOfDay: isNumberInRange(saved.timeOfDay, TIME_OF_DAY.min, TIME_OF_DAY.max)
        ? saved.timeOfDay
        : TIME_OF_DAY.initial,
      dimensionsVisible:
        typeof saved.dimensionsVisible === 'boolean' ? saved.dimensionsVisible : true,
      placement: readPlacement(saved),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: VERSION, ...settings }),
    );
  } catch {
    // Хранилище недоступно (приватный режим, запрет cookies) — работаем без сохранения
  }
}
