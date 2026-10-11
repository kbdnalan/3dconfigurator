import { useCallback, useEffect, useMemo, useState } from 'react';
import Viewer3D from './components/Viewer3D.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SpecDialog from './components/SpecDialog.jsx';
import { CABINET_STYLES, MATERIALS } from './config.js';
import { useTimeOfDay } from './hooks/useTimeOfDay.js';
import { canHaveRod, clampShelves, getCabinetLayout } from './utils/cabinetLayout.js';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './utils/storage.js';

const SAVE_DELAY_MS = 300;
const initialSettings = loadSettings();

export default function App() {
  const [dimensions, setDimensions] = useState(initialSettings.dimensions);
  const [construction, setConstruction] = useState(initialSettings.construction);
  const [materialKey, setMaterialKey] = useState(initialSettings.materialKey);
  const [timeOfDay, setTimeOfDay, animateTimeOfDay] = useTimeOfDay(
    initialSettings.timeOfDay,
  );
  const [dimensionsVisible, setDimensionsVisible] = useState(
    initialSettings.dimensionsVisible,
  );
  const [placement, setPlacement] = useState(initialSettings.placement);
  const [resetToken, setResetToken] = useState(0);
  const [specOpen, setSpecOpen] = useState(false);

  const effectiveConstruction = useMemo(() => {
    const rod = construction.rod && canHaveRod(dimensions.height);
    return {
      style: construction.style,
      rod,
      shelves: clampShelves(construction.shelves, dimensions.height, rod),
    };
  }, [construction, dimensions.height]);

  const layout = useMemo(
    () => getCabinetLayout(dimensions, effectiveConstruction),
    [dimensions, effectiveConstruction],
  );

  const styleLabel = CABINET_STYLES.find(
    (s) => s.key === effectiveConstruction.style,
  ).label;
  const materialLabel = MATERIALS.find((m) => m.key === materialKey).label;
  const summary = `${dimensions.width} × ${dimensions.height} × ${dimensions.depth} мм · ${styleLabel} · ${materialLabel}`;

  useEffect(() => {
    const timer = setTimeout(() => {
      saveSettings({
        dimensions,
        construction: effectiveConstruction,
        materialKey,
        timeOfDay,
        dimensionsVisible,
        placement,
      });
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [
    dimensions,
    effectiveConstruction,
    materialKey,
    timeOfDay,
    dimensionsVisible,
    placement,
  ]);

  const handleDimensionChange = useCallback((key, value) => {
    setDimensions((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const handlePlacementChange = useCallback((next) => {
    setPlacement((prev) => (prev.x === next.x && prev.z === next.z ? prev : next));
  }, []);

  const handleReset = useCallback(() => {
    setDimensions(DEFAULT_SETTINGS.dimensions);
    setConstruction(DEFAULT_SETTINGS.construction);
    setMaterialKey(DEFAULT_SETTINGS.materialKey);
    setTimeOfDay(DEFAULT_SETTINGS.timeOfDay);
    setDimensionsVisible(DEFAULT_SETTINGS.dimensionsVisible);
    setPlacement(DEFAULT_SETTINGS.placement);
    setResetToken((token) => token + 1);
  }, [setTimeOfDay]);

  const exportConfig = {
    dimensions,
    construction: effectiveConstruction,
    material: { key: materialKey, label: materialLabel },
    parts: layout.parts,
    hardware: layout.hardware,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Конфигуратор тумбы</h1>
        <p className="app-subtitle">
          Настройте размеры, конструкцию и материал — модель, чертёж и спецификация
          обновляются сразу.
        </p>
      </header>

      <main className="app-main">
        <section className="viewer-section" aria-label="3D-модель тумбы">
          <ErrorBoundary>
            <Viewer3D
              dimensions={dimensions}
              construction={effectiveConstruction}
              materialKey={materialKey}
              timeOfDay={timeOfDay}
              dimensionsVisible={dimensionsVisible}
              placement={placement}
              onPlacementChange={handlePlacementChange}
            />
          </ErrorBoundary>
        </section>

        <aside className="panel" aria-label="Параметры тумбы">
          <ControlPanel
            dimensions={dimensions}
            construction={effectiveConstruction}
            layout={layout}
            materialKey={materialKey}
            timeOfDay={timeOfDay}
            dimensionsVisible={dimensionsVisible}
            resetToken={resetToken}
            summary={summary}
            onDimensionChange={handleDimensionChange}
            onConstructionChange={setConstruction}
            onMaterialChange={setMaterialKey}
            onTimeOfDayChange={setTimeOfDay}
            onTimeOfDayPreset={animateTimeOfDay}
            onDimensionsVisibleChange={setDimensionsVisible}
            onOpenSpec={() => setSpecOpen(true)}
            onReset={handleReset}
          />
        </aside>
      </main>

      <SpecDialog
        open={specOpen}
        onClose={() => setSpecOpen(false)}
        layout={layout}
        summary={summary}
        config={exportConfig}
      />
    </div>
  );
}
