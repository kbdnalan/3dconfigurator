import { MATERIALS } from '../config.js';

export default function MaterialPicker({ value, onChange }) {
  return (
    <div className="materials" role="group" aria-label="Материал корпуса">
      {MATERIALS.map((material) => {
        const isActive = material.key === value;
        return (
          <button
            key={material.key}
            type="button"
            className={`material${isActive ? ' material--active' : ''}`}
            aria-pressed={isActive}
            onClick={() => onChange(material.key)}
          >
            <span
              className={`material-swatch material-swatch--${material.key}`}
              style={{ backgroundColor: material.color }}
              aria-hidden="true"
            />
            <span className="material-name">{material.label}</span>
            <span className="material-code">{material.color}</span>
          </button>
        );
      })}
    </div>
  );
}
