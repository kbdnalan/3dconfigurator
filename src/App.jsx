import { useCallback, useState } from 'react';
import { DEFAULT_DIMENSIONS, DEFAULT_MATERIAL, TIME_OF_DAY } from './config.js';
import Viewer3D from './components/Viewer3D.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useTimeOfDay } from './hooks/useTimeOfDay.js';

export default function App() {
  const [dimensions, setDimensions] = useState(DEFAULT_DIMENSIONS);
  const [materialKey, setMaterialKey] = useState(DEFAULT_MATERIAL);
  const [timeOfDay, setTimeOfDay, animateTimeOfDay] = useTimeOfDay(TIME_OF_DAY.initial);
  const [dimensionsVisible, setDimensionsVisible] = useState(true);

  const handleDimensionChange = useCallback((key, value) => {
    setDimensions((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Конфигуратор тумбы</h1>
        <p className="app-subtitle">
          Размеры, материал и время суток меняются сразу. Вращайте комнату мышью или
          пальцем, нажмите на дверцу, чтобы открыть её.
        </p>
      </header>

      <main className="app-main">
        <section className="viewer-section" aria-label="3D-модель тумбы">
          <ErrorBoundary>
            <Viewer3D
              dimensions={dimensions}
              materialKey={materialKey}
              timeOfDay={timeOfDay}
              dimensionsVisible={dimensionsVisible}
            />
          </ErrorBoundary>
        </section>

        <aside className="panel" aria-label="Параметры тумбы">
          <ControlPanel
            dimensions={dimensions}
            materialKey={materialKey}
            timeOfDay={timeOfDay}
            dimensionsVisible={dimensionsVisible}
            onDimensionChange={handleDimensionChange}
            onMaterialChange={setMaterialKey}
            onTimeOfDayChange={setTimeOfDay}
            onTimeOfDayPreset={animateTimeOfDay}
            onDimensionsVisibleChange={setDimensionsVisible}
          />
        </aside>
      </main>
    </div>
  );
}
