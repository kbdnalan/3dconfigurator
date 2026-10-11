import { TIME_OF_DAY } from '../config.js';
import { formatTime, getDayPhase } from '../utils/time.js';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" />
        <path d="M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
    </svg>
  );
}

export default function TimeOfDayField({ value, onChange, onPreset }) {
  const { min, max, step, day, night, nightFrom } = TIME_OF_DAY;
  const fill = ((value - min) / (max - min)) * 100;
  const time = formatTime(value);
  const phase = getDayPhase(value);
  const isNight = value >= nightFrom;

  return (
    <div className="field">
      <div className="segmented" role="group" aria-label="Режим освещения">
        <button
          type="button"
          className={`segmented-option${isNight ? '' : ' segmented-option--active'}`}
          aria-pressed={!isNight}
          onClick={() => onPreset(day)}
        >
          <SunIcon />
          День
        </button>
        <button
          type="button"
          className={`segmented-option${isNight ? ' segmented-option--active' : ''}`}
          aria-pressed={isNight}
          onClick={() => onPreset(night)}
        >
          <MoonIcon />
          Ночь
        </button>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="time-of-day">
          Время суток
        </label>
        <span className="time-value">
          <span className="time-phase">{phase}</span>
          {time}
        </span>
      </div>

      <input
        id="time-of-day"
        className="field-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--fill': `${fill}%` }}
        aria-valuetext={`${time}, ${phase}`}
      />

      <p className="field-message">
        <span>{formatTime(min)}</span>
        <span>{formatTime(max)}</span>
      </p>
    </div>
  );
}
