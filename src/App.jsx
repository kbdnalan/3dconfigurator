import { useCallback, useState } from 'react';
import { DEFAULT_DIMENSIONS, DEFAULT_MATERIAL } from './config.js';
import Viewer3D from './components/Viewer3D.jsx';
import ControlPanel from './components/ControlPanel.jsx';

export default function App() {
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  const [materialKey, setMaterialKey] = useState(DEFAULT_MATERIAL);

  const handleDimensionChange = useCallback((key, value) => {
    setDimensions((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Конфигуратор тумбы</h1>
        <p className="app-subtitle">
          Задайте размеры и материал — 3D-модель обновится сразу. Вращайте модель мышью
          или пальцем, нажмите на дверцу, чтобы открыть её.
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
