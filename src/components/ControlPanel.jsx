import { DIMENSION_FIELDS } from '../config.js';
import DimensionField from './DimensionField.jsx';
import MaterialPicker from './MaterialPicker.jsx';

/** Панель параметров: размеры и материал. */
export default function ControlPanel({
  dimensions,
  materialKey,
  doorOpen,
  onDimensionChange,
  onMaterialChange,
  onDoorToggle,
}) {
  return (
    <div className="panel-inner">
      <section className="panel-section" aria-labelledby="dimensions-title">
        <h2 id="dimensions-title" className="panel-title">
          Размеры
        </h2>
        {DIMENSION_FIELDS.map(({ key, label }) => (
          <DimensionField
            key={key}
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

      <section className="panel-section" aria-labelledby="door-title">
        <h2 id="door-title" className="panel-title">
          Дверца
        </h2>
        <button
          type="button"
          className="door-button"
          aria-pressed={doorOpen}
          onClick={onDoorToggle}
        >
          {doorOpen ? 'Закрыть дверцу' : 'Открыть дверцу'}
        </button>
      </section>
    </div>
  );
}
