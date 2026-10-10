import { useCallback, useState } from 'react';
import { DEFAULT_DIMENSIONS, DEFAULT_MATERIAL } from './config.js';
import Viewer3D from './components/Viewer3D.jsx';
import ControlPanel from './components/ControlPanel.jsx';

/**
 * Корневой компонент. Здесь хранится всё состояние конфигуратора:
 * размеры (мм) и выбранный материал. Дочерние компоненты получают их через props.
 */
export default function App() {
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  const [materialKey, setMaterialKey] = useState(DEFAULT_MATERIAL);

  // Меняем один размер. Если значение не изменилось — возвращаем
  // старый объект, и React не делает лишнюю перерисовку
  const handleDimensionChange = useCallback((key, value) => {
    setDimensions((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Конфигуратор тумбы</h1>
        <p className="app-subtitle">
          Задайте размеры и материал — 3D-модель обновится сразу. Вращайте модель мышью
          или пальцем.
        </p>
      </header>

      <main className="app-main">
        <section className="viewer-section" aria-label="3D-модель тумбы">
          <Viewer3D dimensions={dimensions} materialKey={materialKey} />
        </section>

        <aside className="panel" aria-label="Параметры тумбы">
          <ControlPanel
            dimensions={dimensions}
            materialKey={materialKey}
            onDimensionChange={handleDimensionChange}
            onMaterialChange={setMaterialKey}
          />
        </aside>
      </main>
    </div>
  );
}
