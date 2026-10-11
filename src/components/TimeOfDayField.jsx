import { TIME_OF_DAY } from '../config.js';
import { formatTime, getDayPhase } from '../utils/time.js';

export default function TimeOfDayField({ value, onChange }) {
  const { min, max, step } = TIME_OF_DAY;
  const fill = ((value - min) / (max - min)) * 100;
  const time = formatTime(value);
  const phase = getDayPhase(value);

  return (
    <div className="field">
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
