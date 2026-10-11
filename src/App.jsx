import { useCallback, useEffect, useState } from 'react';
import Viewer3D from './components/Viewer3D.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useTimeOfDay } from './hooks/useTimeOfDay.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './utils/storage.js';

const SAVE_DELAY_MS = 300;
const initialSettings = loadSettings();

export default function App() {
  const [dimensions, setDimensions] = useState(initialSettings.dimensions);
  const [materialKey, setMaterialKey] = useState(initialSettings.materialKey);
  const [timeOfDay, setTimeOfDay, animateTimeOfDay] = useTimeOfDay(
    initialSettings.timeOfDay,
  );
  const [dimensionsVisible, setDimensionsVisible] = useState(
    initialSettings.dimensionsVisible,
  );
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveSettings({ dimensions, materialKey, timeOfDay, dimensionsVisible });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dimensions, materialKey, timeOfDay, dimensionsVisible]);

  const handleDimensionChange = useCallback((key, value) => {
    setDimensions((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const handleReset = useCallback(() => {
    setDimensions(DEFAULT_SETTINGS.dimensions);
    setMaterialKey(DEFAULT_SETTINGS.materialKey);
    setTimeOfDay(DEFAULT_SETTINGS.timeOfDay);
    setDimensionsVisible(DEFAULT_SETTINGS.dimensionsVisible);
    setResetToken((token) => token + 1);
  }, [setTimeOfDay]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Конфигуратор тумбы</h1>
        <p className="app-subtitle">
          Размеры, материал и время суток меняются сразу и сохраняются в браузере.
          Вращайте комнату мышью или пальцем, нажмите на дверцу, чтобы открыть её.
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
            resetToken={resetToken}
            onDimensionChange={handleDimensionChange}
            onMaterialChange={setMaterialKey}
            onTimeOfDayChange={setTimeOfDay}
            onTimeOfDayPreset={animateTimeOfDay}
            onDimensionsVisibleChange={setDimensionsVisible}
            onReset={handleReset}
          />
        </aside>
      </main>
    </div>
  );
}
