import { useEffect, useRef, useState } from 'react';
import { SceneManager } from '../three/SceneManager.js';

/**
 * Область 3D-просмотра.
 * React рендерит пустой <div ref={containerRef}> и больше его не трогает,
 * а Three.js сам добавляет туда <canvas> — так они не конфликтуют за DOM.
 */
export default function Viewer3D({ dimensions, materialKey, doorOpen }) {
  const containerRef = useRef(null);
  const managerRef = useRef(null);
  const [webglError, setWebglError] = useState(false);
  const { width, height, depth } = dimensions;

  // 1. Создаём сцену один раз при монтировании и полностью удаляем при размонтировании.
  //    Пустой массив зависимостей [] — эффект не перезапускается при смене параметров,
  //    поэтому новый WebGL-renderer не создаётся.
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

  // 2. Размеры изменились — перестраиваем только модель, renderer остаётся тем же.
  useEffect(() => {
    managerRef.current?.setDimensions({ width, height, depth });
  }, [width, height, depth]);

  // 3. Материал изменился — меняем материал деталей.
  useEffect(() => {
    managerRef.current?.setMaterial(materialKey);
  }, [materialKey]);

  // 4. Открываем или закрываем дверцу (анимацию делает SceneManager).
  useEffect(() => {
    managerRef.current?.setDoorOpen(doorOpen);
  }, [doorOpen]);

  return (
    <div className="viewer">
      <div ref={containerRef} className="viewer-canvas" />

      {webglError ? (
        <div className="viewer-error" role="alert">
          Ваш браузер не поддерживает WebGL, поэтому 3D-модель не может быть показана.
        </div>
      ) : (
        <p className="viewer-hint">
          <span className="hint-desktop">
            Зажмите левую кнопку мыши — вращение · Колесо — масштаб
          </span>
          <span className="hint-touch">
            Проведите пальцем — вращение · Щипок — масштаб
          </span>
        </p>
      )}
    </div>
  );
}
