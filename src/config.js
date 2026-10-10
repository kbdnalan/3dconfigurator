// Общие настройки конфигуратора. Все размеры в интерфейсе — в миллиметрах.

export const DEFAULT_DIMENSIONS = {
  width: 600,
  height: 700,
  depth: 400,
};

// Допустимый диапазон для каждого размера, мм
export const DIMENSION_LIMITS = {
  min: 200,
  max: 2000,
};

// Описание полей ввода размеров (порядок = порядок в панели)
export const DIMENSION_FIELDS = [
  { key: 'width', label: 'Ширина' },
  { key: 'height', label: 'Высота' },
  { key: 'depth', label: 'Глубина' },
];

// Варианты материала корпуса
export const MATERIALS = [
  { key: 'white', label: 'Белый', color: '#F2F2F0' },
  { key: 'gray', label: 'Серый', color: '#888888' },
  { key: 'walnut', label: 'Орех', color: '#805333' },
];

export const DEFAULT_MATERIAL = 'white';
