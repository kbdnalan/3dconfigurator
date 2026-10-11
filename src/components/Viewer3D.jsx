import { useEffect, useRef, useState } from 'react';
import { SceneManager } from '../three/SceneManager.js';

const MODES = [
  { key: 'rotate', label: 'Вращать' },
  { key: 'move', label: 'Двигать' },
];

const HINTS = {
  rotate: {
    desktop: 'Мышь — вращение · Колесо — масштаб · Клик по фасаду — открыть',
    touch: 'Вращайте пальцем · Нажмите на дверцу',
  },
  move: {
    desktop: 'Левая кнопка — двигать тумбу · Правая — осмотр · Колесо — масштаб',
    touch: 'Палец — двигать · Два пальца — поворот и масштаб',
  },
};

export default function Viewer3D({
  dimensions,
  construction,
  materialKey,
  timeOfDay,
  dimensionsVisible,
  placement,
  onPlacementChange,
}) {
  const containerRef = useRef(null);
  const managerRef = useRef(null);
  const placementCallbackRef = useRef(onPlacementChange);
  const [webglError, setWebglError] = useState(false);
  const [mode, setMode] = useState('rotate');
  const { width, height, depth } = dimensions;
  const { style, shelves, rod } = construction;

  useEffect(() => {
    placementCallbackRef.current = onPlacementChange;
  }, [onPlacementChange]);

  useEffect(() => {
    let manager;
    try {
      manager = new SceneManager(containerRef.current, {
        onPlacementChange: (value) => placementCallbackRef.current?.(value),
      });
    } catch (error) {
      console.error('Не удалось запустить WebGL:', error);
      setWebglError(true);
      return undefined;
    }
    managerRef.current = manager;

    return () => {
      manager.dispose();
      managerRef.current = null;
    };
  }, []);

  useEffect(() => {
    managerRef.current?.setConstruction({ style, shelves, rod });
  }, [style, shelves, rod]);

  useEffect(() => {
    managerRef.current?.setDimensions({ width, height, depth });
  }, [width, height, depth]);

  useEffect(() => {
    managerRef.current?.setPlacement(placement.x, placement.z);
  }, [placement.x, placement.z]);

  useEffect(() => {
    managerRef.current?.setMaterial(materialKey);
  }, [materialKey]);

  useEffect(() => {
    managerRef.current?.setTimeOfDay(timeOfDay);
  }, [timeOfDay]);

  useEffect(() => {
    managerRef.current?.setDimensionsVisible(dimensionsVisible);
  }, [dimensionsVisible]);

  useEffect(() => {
    managerRef.current?.setMode(mode);
  }, [mode]);

  const hint = HINTS[mode];

  return (
    <div className="viewer">
      <div ref={containerRef} className="viewer-canvas" />

      {webglError ? (
        <div className="viewer-error" role="alert">
          Ваш браузер не поддерживает WebGL, поэтому 3D-модель не может быть показана.
        </div>
      ) : (
        <>
          <div className="viewer-toolbar">
            <div className="segmented segmented--compact" role="group" aria-label="Режим">
              {MODES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`segmented-option${mode === item.key ? ' segmented-option--active' : ''}`}
                  aria-pressed={mode === item.key}
                  onClick={() => setMode(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="viewer-actions">
              <button
                type="button"
                className="viewer-button"
                onClick={() => onPlacementChange({ x: 0, z: 0 })}
              >
                В центр
              </button>
              <button
                type="button"
                className="viewer-button"
                onClick={() => managerRef.current?.resetView()}
              >
                Исходный вид
              </button>
            </div>
          </div>

          <p className="viewer-hint">
            <span className="hint-desktop">{hint.desktop}</span>
            <span className="hint-touch">{hint.touch}</span>
          </p>
        </>
      )}
    </div>
  );
}
