import { useEffect, useRef, useState } from 'react';
import { SceneManager } from '../three/SceneManager.js';

export default function Viewer3D({
  dimensions,
  materialKey,
  timeOfDay,
  dimensionsVisible,
}) {
  const containerRef = useRef(null);
  const managerRef = useRef(null);
  const [webglError, setWebglError] = useState(false);
  const { width, height, depth } = dimensions;

  useEffect(() => {
    let manager;
    try {
      manager = new SceneManager(containerRef.current);
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
    managerRef.current?.setDimensions({ width, height, depth });
  }, [width, height, depth]);

  useEffect(() => {
    managerRef.current?.setMaterial(materialKey);
  }, [materialKey]);

  useEffect(() => {
    managerRef.current?.setTimeOfDay(timeOfDay);
  }, [timeOfDay]);

  useEffect(() => {
    managerRef.current?.setDimensionsVisible(dimensionsVisible);
  }, [dimensionsVisible]);

  return (
    <div className="viewer">
      <div ref={containerRef} className="viewer-canvas" />

      {webglError ? (
        <div className="viewer-error" role="alert">
          Ваш браузер не поддерживает WebGL, поэтому 3D-модель не может быть показана.
        </div>
      ) : (
        <button
          type="button"
          className="viewer-reset"
          onClick={() => managerRef.current?.resetView()}
        >
          Исходный вид
        </button>
      )}

      {!webglError && (
        <p className="viewer-hint">
          <span className="hint-desktop">
            Перетаскивание — вращение · Колесо — масштаб · Клик по дверце — открыть
          </span>
          <span className="hint-touch">Вращайте пальцем · Нажмите на дверцу</span>
        </p>
      )}
    </div>
  );
}
