import { DIMENSION_FIELDS } from '../config.js';
import DimensionField from './DimensionField.jsx';
import MaterialPicker from './MaterialPicker.jsx';
import TimeOfDayField from './TimeOfDayField.jsx';

export default function ControlPanel({
  dimensions,
  materialKey,
  timeOfDay,
  dimensionsVisible,
  resetToken,
  onDimensionChange,
  onMaterialChange,
  onTimeOfDayChange,
  onTimeOfDayPreset,
  onDimensionsVisibleChange,
  onReset,
}) {
  return (
    <div className="panel-inner">
      <section className="panel-section" aria-labelledby="dimensions-title">
        <h2 id="dimensions-title" className="panel-title">
          Размеры
        </h2>
        {DIMENSION_FIELDS.map(({ key, label }) => (
          <DimensionField
            key={`${key}-${resetToken}`}
            id={`dimension-${key}`}
            label={label}
            value={dimensions[key]}
            onChange={(value) => onDimensionChange(key, value)}
          />
        ))}
      </section>

      <section className="panel-section" aria-labelledby="material-title">
        <h2 id="material-title" className="panel-title">
          Материал
        </h2>
        <MaterialPicker value={materialKey} onChange={onMaterialChange} />
      </section>

      <section className="panel-section" aria-labelledby="light-title">
        <h2 id="light-title" className="panel-title">
          Освещение
        </h2>
        <TimeOfDayField
          value={timeOfDay}
          onChange={onTimeOfDayChange}
          onPreset={onTimeOfDayPreset}
        />
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={dimensionsVisible}
            onChange={(event) => onDimensionsVisibleChange(event.target.checked)}
          />
          <span className="switch-track" aria-hidden="true" />
          <span className="switch-label">Размерные линии</span>
        </label>
      </section>

      <button type="button" className="reset-button" onClick={onReset}>
        Сбросить настройки
      </button>
    </div>
  );
}
