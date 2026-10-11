import { useState } from 'react';
import { DIMENSION_LIMITS } from '../config.js';
import { clampDimension, validateDimension } from '../utils/validation.js';

const SLIDER_STEP = 10;

export default function DimensionField({ id, label, value, onChange }) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState(null);
  const errorId = `${id}-error`;
  const { min, max } = DIMENSION_LIMITS;
  const fill = ((value - min) / (max - min)) * 100;

  function handleTextChange(event) {
    const nextText = event.target.value;
    setText(nextText);
    const result = validateDimension(nextText);
    setError(result.error);
    if (result.value !== null) onChange(result.value);
  }

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

  function handleSliderChange(event) {
    const nextValue = Number(event.target.value);
    setText(String(nextValue));
    setError(null);
    onChange(nextValue);
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

      <input
        className="field-slider"
        type="range"
        min={min}
        max={max}
        step={SLIDER_STEP}
        value={value}
        onChange={handleSliderChange}
        style={{ '--fill': `${fill}%` }}
        aria-label={`${label}, мм`}
      />

      <p id={errorId} className="field-message" aria-live="polite">
        {error ?? (
          <>
            <span>{min} мм</span>
            <span>{max} мм</span>
          </>
        )}
      </p>
    </div>
  );
}
