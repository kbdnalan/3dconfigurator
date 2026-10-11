export const DEFAULT_DIMENSIONS = {
  width: 600,
  height: 700,
  depth: 400,
};

export const DIMENSION_LIMITS = {
  min: 200,
  max: 2000,
};

export const DIMENSION_FIELDS = [
  { key: 'width', label: 'Ширина' },
  { key: 'height', label: 'Высота' },
  { key: 'depth', label: 'Глубина' },
];

export const MATERIALS = [
  { key: 'white', label: 'Белый', color: '#F2F2F0' },
  { key: 'gray', label: 'Серый', color: '#888888' },
  { key: 'walnut', label: 'Орех', color: '#805333' },
];

export const DEFAULT_MATERIAL = 'white';

export const TIME_OF_DAY = {
  min: 7,
  max: 21,
  step: 0.25,
  initial: 15,
  day: 13,
  night: 21,
  nightFrom: 20,
};

export const CABINET_STYLES = [
  { key: 'doors', label: 'С дверцами' },
  { key: 'drawers', label: 'С ящиками' },
  { key: 'open', label: 'Открытый' },
];

export const DEFAULT_STYLE = 'doors';
export const DEFAULT_SHELVES = 1;
export const DEFAULT_ROD = false;
