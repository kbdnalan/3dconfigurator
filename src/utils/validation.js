import { DIMENSION_LIMITS } from '../config.js';

export function validateDimension(text, limits = DIMENSION_LIMITS) {
  const trimmed = String(text).trim().replace(',', '.');

  if (trimmed === '') {
    return { value: null, error: 'Введите значение' };
  }

  const number = Number(trimmed);

  if (!Number.isFinite(number)) {
    return { value: null, error: 'Допускаются только числа' };
  }

  if (number <= 0) {
    return { value: null, error: 'Размер должен быть больше нуля' };
  }

  const rounded = Math.round(number);

  if (rounded < limits.min) {
    return { value: null, error: `Минимум ${limits.min} мм` };
  }

  if (rounded > limits.max) {
    return { value: null, error: `Максимум ${limits.max} мм` };
  }

  return { value: rounded, error: null };
}

export function clampDimension(number, limits = DIMENSION_LIMITS) {
  return Math.min(limits.max, Math.max(limits.min, Math.round(number)));
}
