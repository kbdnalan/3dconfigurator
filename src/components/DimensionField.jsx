import { useState } from 'react';
import { DIMENSION_LIMITS } from '../config.js';
import { clampDimension, validateDimension } from '../utils/validation.js';

/**
 * Поле одного размера в мм.
 * В поле можно временно ввести что угодно (например, стереть число),
 * но в 3D-модель уходит только корректное значение.
 */
export default function DimensionField({ id, label, value, onChange }) {
  // text — то, что сейчас написано в поле (может быть временно некорректным)
  const [text, setText] = useState(String(value));
  const [error, setError] = useState(null);
  const errorId = `${id}-error`;

  function handleTextChange(event) {
    const nextText = event.target.value;
    setText(nextText);
    const result = validateDimension(nextText);
    setError(result.error);
    if (result.value !== null) onChange(result.value); // модель обновляется сразу
  }

  // При уходе из поля приводим текст в порядок:
  // число вне диапазона «прижимаем» к границе, мусор заменяем последним верным значением
  function handleBlur() {
    if (!error) {
      setText(String(value));
      return;
    }
    const number = Number(String(text).trim().replace(',', '.'));
    if (Number.isFinite(number) && number > 0) {
      const clamped = clampDimension(number);
      setText(String(clamped));
      onChange(clamped);
    } else {
      setText(String(value));
    }
    setError(null);
  }

  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <div className="field-row">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <div className="field-input-wrap">
          <input
            id={id}
            className="field-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
          />
          <span className="field-unit">мм</span>
        </div>
      </div>

      <p id={errorId} className="field-message" aria-live="polite">
        {error ?? `от ${DIMENSION_LIMITS.min} до ${DIMENSION_LIMITS.max} мм`}
      </p>
    </div>
  );
}
