import { useState } from 'react';
import { DIMENSION_FIELDS } from '../config.js';
import DimensionField from './DimensionField.jsx';
import MaterialPicker from './MaterialPicker.jsx';
import TimeOfDayField from './TimeOfDayField.jsx';
import ConstructionPicker from './ConstructionPicker.jsx';

const TABS = [
  { key: 'size', label: 'Размеры' },
  { key: 'construction', label: 'Конструкция' },
  { key: 'look', label: 'Вид' },
];

export default function ControlPanel({
  dimensions,
  construction,
  layout,
  materialKey,
  timeOfDay,
  dimensionsVisible,
  resetToken,
  summary,
  onDimensionChange,
  onConstructionChange,
  onMaterialChange,
  onTimeOfDayChange,
  onTimeOfDayPreset,
  onDimensionsVisibleChange,
  onOpenSpec,
  onReset,
}) {
  const [tab, setTab] = useState('size');

  return (
    <div className="panel-inner">
      <div className="tabs" role="tablist" aria-label="Параметры">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls={`panel-${item.key}`}
            className={`tab${tab === item.key ? ' tab--active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="tab-panel"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'size' && (
          <section className="panel-section">
            {DIMENSION_FIELDS.map(({ key, label }) => (
              <DimensionField
                key={`${key}-${resetToken}`}
                id={`dimension-${key}`}
                label={label}
                value={dimensions[key]}
                onChange={(value) => onDimensionChange(key, value)}
              />
            ))}
            <label className="switch">
              <input
                type="checkbox"
                role="switch"
                checked={dimensionsVisible}
                onChange={(event) => onDimensionsVisibleChange(event.target.checked)}
              />
              <span className="switch-track" aria-hidden="true" />
              <span className="switch-label">Размерные линии в 3D</span>
            </label>
          </section>
        )}

        {tab === 'construction' && (
          <section className="panel-section">
            <ConstructionPicker
              construction={construction}
              layout={layout}
              height={dimensions.height}
              onChange={onConstructionChange}
            />
          </section>
        )}

        {tab === 'look' && (
          <>
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
            </section>
          </>
        )}
      </div>

      <footer className="panel-footer">
        <p className="summary">{summary}</p>
        <button type="button" className="button button--primary" onClick={onOpenSpec}>
          Чертёж и спецификация
        </button>
        <button type="button" className="button button--ghost" onClick={onReset}>
          Сбросить настройки
        </button>
      </footer>
    </div>
  );
}
