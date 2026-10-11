import { CABINET_STYLES } from '../config.js';
import { canHaveRod, getDrawerCount, getMaxShelves } from '../utils/cabinetLayout.js';

export default function ConstructionPicker({ construction, layout, height, onChange }) {
  const { style, shelves, rod } = construction;
  const hasInterior = style !== 'drawers';
  const rodAllowed = canHaveRod(height);
  const maxShelves = getMaxShelves(height, rod && rodAllowed);
  const update = (patch) => onChange({ ...construction, ...patch });

  return (
    <div className="construction">
      <div className="segmented segmented--three" role="group" aria-label="Вид тумбы">
        {CABINET_STYLES.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`segmented-option${style === item.key ? ' segmented-option--active' : ''}`}
            aria-pressed={style === item.key}
            onClick={() => update({ style: item.key })}
          >
            {item.label}
          </button>
        ))}
      </div>

      {hasInterior ? (
        <>
          <label className={`switch${rodAllowed ? '' : ' switch--disabled'}`}>
            <input
              type="checkbox"
              role="switch"
              checked={rod && rodAllowed}
              disabled={!rodAllowed}
              onChange={(event) => update({ rod: event.target.checked })}
            />
            <span className="switch-track" aria-hidden="true" />
            <span className="switch-label">Штанга для одежды</span>
          </label>
          {!rodAllowed && (
            <p className="construction-note">Штанга доступна при высоте от 520 мм</p>
          )}

          <div className="field-row construction-row">
            <span className="field-label" id="shelves-label">
              Полки
            </span>
            <div className="stepper" role="group" aria-labelledby="shelves-label">
              <button
                type="button"
                className="stepper-button"
                aria-label="Убрать полку"
                disabled={shelves <= 0}
                onClick={() => update({ shelves: shelves - 1 })}
              >
                −
              </button>
              <span className="stepper-value" aria-live="polite">
                {shelves}
              </span>
              <button
                type="button"
                className="stepper-button"
                aria-label="Добавить полку"
                disabled={shelves >= maxShelves}
                onClick={() => update({ shelves: shelves + 1 })}
              >
                +
              </button>
            </div>
          </div>
          <p className="construction-note">
            {maxShelves === 0
              ? 'Полки не помещаются при такой высоте'
              : `Можно до ${maxShelves}${rod && rodAllowed ? ' под штангой' : ''}`}
          </p>
        </>
      ) : (
        <p className="construction-note">
          Ящиков: {getDrawerCount(height)} — количество зависит от высоты. Нажмите на ящик
          в 3D, чтобы выдвинуть его.
        </p>
      )}

      <dl className="facts">
        <div>
          <dt>Внутри (Ш × В × Г)</dt>
          <dd>
            {Math.round(layout.innerWidth)} × {Math.round(layout.innerHeight)} ×{' '}
            {Math.round(layout.innerDepth)} мм
          </dd>
        </div>
        <div>
          <dt>Толщина корпуса / фасада</dt>
          <dd>18 / 18 мм</dd>
        </div>
      </dl>
    </div>
  );
}
