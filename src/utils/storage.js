import {
  DEFAULT_DIMENSIONS,
  DEFAULT_MATERIAL,
  DIMENSION_LIMITS,
  MATERIALS,
  TIME_OF_DAY,
} from '../config.js';

const STORAGE_KEY = 'cabinet-configurator:settings';
const VERSION = 1;

export const DEFAULT_SETTINGS = {
  dimensions: DEFAULT_DIMENSIONS,
  materialKey: DEFAULT_MATERIAL,
  timeOfDay: TIME_OF_DAY.initial,
  dimensionsVisible: true,
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
      materialKey: MATERIALS.some((m) => m.key === saved.materialKey)
        ? saved.materialKey
        : DEFAULT_MATERIAL,
      timeOfDay: isNumberInRange(saved.timeOfDay, TIME_OF_DAY.min, TIME_OF_DAY.max)
        ? saved.timeOfDay
        : TIME_OF_DAY.initial,
      dimensionsVisible:
        typeof saved.dimensionsVisible === 'boolean' ? saved.dimensionsVisible : true,
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
