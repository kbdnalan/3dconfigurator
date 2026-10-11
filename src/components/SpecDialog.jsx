import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import CabinetDrawing from './CabinetDrawing.jsx';
import { BACK, FRONT, PANEL } from '../utils/cabinetLayout.js';

const mm = (value) => `${Math.round(value)} мм`;

function downloadJson(config) {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `tumba-${config.dimensions.width}x${config.dimensions.height}x${config.dimensions.depth}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SpecDialog({ open, onClose, layout, summary, config }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const fronts = [
    ...layout.doors.map(() => `${mm(layout.frontHeight)} × ${mm(layout.doors[0].width)}`),
    ...layout.drawers.map((d) => `${mm(d.width)} × ${mm(d.height)}`),
  ];

  return createPortal(
    <dialog
      ref={dialogRef}
      className="spec-dialog"
      onClose={onClose}
      onClick={(event) => event.target === dialogRef.current && onClose()}
      aria-labelledby="spec-title"
    >
      <div className="spec">
        <header className="spec-header">
          <div>
            <h2 id="spec-title" className="spec-title">
              Чертёж и спецификация
            </h2>
            <p className="spec-subtitle">{summary}</p>
          </div>
          <button
            type="button"
            className="spec-close"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <CabinetDrawing layout={layout} />
        <p className="spec-legend">
          Сплошные линии — видимые кромки, пунктир — скрытые детали (полки, штанга).
          Размеры в миллиметрах.
        </p>

        <div className="spec-grid">
          <section>
            <h3 className="spec-heading">Основные размеры</h3>
            <dl className="facts">
              <div>
                <dt>Габарит (Ш × В × Г)</dt>
                <dd>
                  {layout.W} × {layout.H} × {layout.D} мм
                </dd>
              </div>
              <div>
                <dt>Внутреннее пространство</dt>
                <dd>
                  {Math.round(layout.innerWidth)} × {Math.round(layout.innerHeight)} ×{' '}
                  {Math.round(layout.innerDepth)} мм
                </dd>
              </div>
              <div>
                <dt>Корпус / фасад / задняя стенка</dt>
                <dd>
                  {PANEL} / {FRONT} / {BACK} мм
                </dd>
              </div>
              <div>
                <dt>Фасады</dt>
                <dd>{fronts.length ? `${fronts.length} шт. · ${fronts[0]}` : 'нет'}</dd>
              </div>
              <div>
                <dt>Площадь плиты 18 мм</dt>
                <dd>{layout.boardArea} м²</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="spec-heading">Фурнитура</h3>
            {layout.hardware.length ? (
              <ul className="spec-list">
                {layout.hardware.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.qty} шт.</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="construction-note">Не требуется</p>
            )}
          </section>
        </div>

        <h3 className="spec-heading">Детали корпуса</h3>
        <div className="spec-table-wrap">
          <table className="spec-table">
            <thead>
              <tr>
                <th>Деталь</th>
                <th>Кол-во</th>
                <th>Размер, мм</th>
                <th>Толщина</th>
              </tr>
            </thead>
            <tbody>
              {layout.parts.map((part) => (
                <tr key={part.name}>
                  <td>{part.name}</td>
                  <td>{part.qty}</td>
                  <td>
                    {part.a} × {part.b}
                  </td>
                  <td>{part.t} мм</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="spec-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => downloadJson(config)}
          >
            Скачать конфигурацию
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => window.print()}
          >
            Сохранить PDF / печать
          </button>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
