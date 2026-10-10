import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createMaterials } from './materials.js';
import { createCabinet, MM } from './createCabinet.js';
import { createDimensions } from './createDimensions.js';

const BACKGROUND = '#e4e5e7';
// Начальный ракурс: спереди, справа и сверху — видны фасад, бок и крышка
const DEFAULT_VIEW_DIRECTION = new THREE.Vector3(0.9, 0.62, 1.55).normalize();
// Основной свет падает слева-спереди-сверху: правый бок чуть темнее — появляется объём
const LIGHT_DIRECTION = new THREE.Vector3(-0.6, 1.35, 0.9).normalize();
const DIMENSION_MARGIN = 0.16; // запас вокруг тумбы под размерные линии и подписи, м
const DOOR_OPEN_ANGLE = THREE.MathUtils.degToRad(100); // насколько открывается дверца
const DOOR_DURATION = 600; // длительность открывания, мс

/** Освобождает память видеокарты: геометрии объекта и удаляет HTML-подписи. */
function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.isCSS2DObject) child.element.remove();
  });
  // Материалы здесь НЕ удаляем: они общие и живут до размонтирования сцены
}

/**
 * Управляет всей 3D-сценой. React создаёт один экземпляр при монтировании
 * и вызывает dispose() при размонтировании.
 */
export class SceneManager {
  constructor(container) {
    this.container = container;
    this.frameId = null;
    this.disposed = false;
    this.dimensions = null;
    this.materialKey = 'white';
    this.cabinet = null;
    this.dimensionLines = null;
    this.hasCameraView = false;
    // Состояние дверцы: 0 — закрыта, 1 — открыта. progress плавно идёт к target.
    this.doorTarget = 0;
    this.doorProgress = 0;
    this.doorAngle = 0; // текущий угол открывания, радианы
    this.lastFrameTime = null;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initFloor();
    this.materials = createMaterials(this.renderer.capabilities.getMaxAnisotropy());

    // Следим за размером контейнера (окно, поворот телефона, перестройка вёрстки)
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(container);
    this.handleResize();
  }

  // ---------- Инициализация ----------

  initRenderer() {
    // WebGL-renderer создаётся ОДИН раз за всё время жизни компонента
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    // Чёткость на экранах с высокой плотностью; выше 2 — лишняя нагрузка
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral tone mapping точно передаёт цвета материалов — важно при выборе цвета
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // мягкие края теней
    this.renderer = renderer;
    this.container.appendChild(renderer.domElement);

    // Отдельный «рендерер» для HTML-подписей размеров поверх canvas
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'viewer-labels';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    // Туман цвета фона: пол плавно растворяется вдали, нет резкого горизонта.
    // Начинается дальше, чем может отъехать камера, — тумбу не затуманивает.
    scene.fog = new THREE.Fog(BACKGROUND, 20, 45);
    this.scene = scene;
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true; // плавное замедление после вращения
    controls.dampingFactor = 0.08;
    controls.enablePan = false; // без сдвига модель не «уедет» из кадра
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    // Не даём смотреть строго сверху (камера «переворачивается») и заглядывать под пол
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    // Любое движение камеры запрашивает новый кадр
    controls.addEventListener('change', this.requestRender);
    this.controls = controls;
  }

  initLights() {
    // Рассеянный свет: сверху — белый «небесный», снизу — тёплый отражённый от пола
    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#c9c4bc', 2.2);
    this.scene.add(this.hemiLight);

    // Основной направленный свет с мягкими тенями
    const keyLight = new THREE.DirectionalLight('#ffffff', 2.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);
    this.scene.add(keyLight.target);
    this.keyLight = keyLight;

    // Слабая контровая подсветка справа-сзади, чтобы теневые стороны не были «провалом»
    this.fillLight = new THREE.DirectionalLight('#ffffff', 0.45);
    this.fillLight.position.set(4, 3, -3);
    this.scene.add(this.fillLight);
  }

  initFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: '#d9dadc', roughness: 1, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2; // плоскость по умолчанию вертикальная — кладём её
    floor.position.y = -0.0005; // чуть ниже нуля, чтобы линии у пола не мерцали
    floor.receiveShadow = true;
    this.floor = floor;
    this.scene.add(floor);
  }

  // ---------- Публичные методы (вызываются из React) ----------

  /** Перестраивает тумбу и размерные линии под новые размеры (в мм). */
  setDimensions(dimensions) {
    if (this.disposed) return;
    this.dimensions = { ...dimensions };

    // Старые объекты удаляем из сцены и освобождаем их геометрию
    this.removeObject(this.cabinet);
    this.removeObject(this.dimensionLines);

    this.cabinet = createCabinet(this.dimensions, this.materials, this.materialKey);
    this.dimensionLines = createDimensions(this.dimensions, this.materials.dimensionLine);
    this.scene.add(this.cabinet, this.dimensionLines);
    this.applyDoorAngle(); // новая тумба сохраняет текущее положение дверцы

    this.updateShadowCamera();
    this.fitCamera();
    this.requestRender();
  }

  /** Меняет материал всех деталей корпуса: просто назначаем другой готовый материал. */
  setMaterial(materialKey) {
    if (this.disposed || !this.materials.body[materialKey]) return;
    this.materialKey = materialKey;
    if (this.cabinet) {
      const material = this.materials.body[materialKey];
      this.cabinet.traverse((child) => {
        if (child.isMesh && child.userData.part === 'body') child.material = material;
      });
    }
    this.requestRender();
  }

  /** Открывает или закрывает дверцу с плавной анимацией. */
  setDoorOpen(isOpen) {
    if (this.disposed) return;
    this.doorTarget = isOpen ? 1 : 0;
    this.requestRender();
  }

  // ---------- Дверца ----------

  /**
   * Сдвигает doorProgress к doorTarget пропорционально прошедшему времени.
   * Возвращает true, если дверца ещё в движении (нужен следующий кадр).
   */
  updateDoor(now) {
    if (this.doorProgress === this.doorTarget) return false;

    // Время с прошлого кадра: анимация идёт с одной скоростью при любой частоте экрана
    const delta = this.lastFrameTime === null ? 16 : now - this.lastFrameTime;
    const step = delta / DOOR_DURATION;
    this.doorProgress =
      this.doorTarget > this.doorProgress
        ? Math.min(this.doorTarget, this.doorProgress + step)
        : Math.max(this.doorTarget, this.doorProgress - step);

    this.applyDoorAngle();
    // Если открывающаяся дверца выходит за кадр — камера плавно отъезжает
    this.fitCamera({ onlyIfCut: true });
    return this.doorProgress !== this.doorTarget;
  }

  /** Поворачивает шарнир дверцы в соответствии с doorProgress. */
  applyDoorAngle() {
    const pivot = this.cabinet?.userData.doorPivot;
    if (!pivot) return;
    const t = this.doorProgress;
    // Плавный старт и плавная остановка (smoothstep) вместо равномерного движения
    const eased = t * t * (3 - 2 * t);
    this.doorAngle = eased * DOOR_OPEN_ANGLE;
    // Минус — правый край дверцы уходит вперёд, к зрителю (петли слева)
    pivot.rotation.y = -this.doorAngle;
  }

  // ---------- Камера, свет, размер ----------

  /** Габариты текущей тумбы в метрах. */
  getSize() {
    const { width, height, depth } = this.dimensions;
    return { W: width * MM, H: height * MM, D: depth * MM };
  }

  /**
   * Расстояние, на котором тумба вместе с размерами целиком помещается в кадр
   * при взгляде с направления direction (единичный вектор от цели к камере).
   */
  getFitDistance(direction, target) {
    const { W, H, D } = this.getSize();
    const m = DIMENSION_MARGIN;
    // Радиус сферы вокруг тумбы — нужен для ограничения приближения
    const radius = Math.sqrt(W * W + H * H + D * D) / 2 + m;

    // Оси камеры: right — вправо по экрану, up — вверх по экрану
    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right);
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const tanH = tanV * this.camera.aspect;

    // Точки, которые должны попасть в кадр: 8 углов габарита (с запасом под размеры)
    const points = [];
    for (const x of [-W / 2 - m, W / 2 + m]) {
      for (const y of [0, H + m]) {
        for (const z of [-D / 2 - m, D / 2 + m]) {
          points.push(new THREE.Vector3(x, y, z));
        }
      }
    }

    // Если дверца открыта — добавляем её дальний край (петля слева спереди,
    // край описывает дугу радиусом ≈ ширине тумбы)
    if (this.doorAngle > 0) {
      const edgeX = -W / 2 + W * Math.cos(this.doorAngle) - 0.05;
      const edgeZ = D / 2 + W * Math.sin(this.doorAngle) + 0.05;
      points.push(new THREE.Vector3(edgeX, 0, edgeZ), new THREE.Vector3(edgeX, H, edgeZ));
    }

    // Для каждой точки считаем, как далеко должна стоять камера,
    // чтобы точка попала в кадр по ширине и по высоте; берём максимум
    let distance = 0;
    for (const point of points) {
      const offset = point.sub(target);
      const depth = offset.dot(direction); // насколько точка ближе к камере, чем цель
      distance = Math.max(
        distance,
        depth + Math.abs(offset.dot(right)) / tanH,
        depth + Math.abs(offset.dot(up)) / tanV,
      );
    }
    return { radius, distance: distance * 1.08 }; // 8% — поля вокруг модели
  }

  /**
   * Наводит камеру на тумбу. Направление взгляда сохраняется (если пользователь
   * уже повернул модель), меняется только расстояние — модель всегда в кадре.
   * onlyIfCut = true: отодвигаем камеру, только если модель перестала помещаться.
   */
  fitCamera({ onlyIfCut = false } = {}) {
    if (!this.dimensions) return;
    const { H } = this.getSize();
    const target = new THREE.Vector3(0, H / 2, 0);

    const direction = this.hasCameraView
      ? this.camera.position.clone().sub(this.controls.target).normalize()
      : DEFAULT_VIEW_DIRECTION.clone();
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    const { radius, distance } = this.getFitDistance(direction, target);

    // Ограничения приближения/отдаления зависят от размера тумбы
    this.controls.minDistance = Math.min(radius * 1.1, distance);
    this.controls.maxDistance = Math.max(distance * 2.2, radius * 3);

    if (onlyIfCut && this.hasCameraView && currentDistance >= distance) {
      this.controls.update();
      return;
    }

    this.controls.target.copy(target);
    this.camera.position.copy(target).addScaledVector(direction, distance);
    this.hasCameraView = true;
    this.controls.update();
  }

  /** Подгоняет область, в которой считаются тени, под размер тумбы. */
  updateShadowCamera() {
    const { W, H, D } = this.getSize();
    // Тень может быть длиннее самой тумбы, а открытая дверца выступает вперёд на свою ширину
    const extent = Math.max(W, D) + H + 0.3;
    const lightDistance = Math.max(W, H, D) * 2 + 3;

    this.keyLight.target.position.set(0, 0, 0);
    this.keyLight.position.copy(LIGHT_DIRECTION).multiplyScalar(lightDistance);

    const shadowCamera = this.keyLight.shadow.camera;
    shadowCamera.left = -extent;
    shadowCamera.right = extent;
    shadowCamera.top = extent;
    shadowCamera.bottom = -extent;
    shadowCamera.near = 0.1;
    shadowCamera.far = lightDistance + extent * 2;
    shadowCamera.updateProjectionMatrix();
  }

  // Стрелочные функции — чтобы `this` всегда указывал на SceneManager,
  // и чтобы ту же ссылку можно было передать в removeEventListener
  handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return; // контейнер скрыт — нечего рисовать

    this.renderer.setSize(width, height, false); // false — размер canvas задаёт CSS
    this.labelRenderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.fitCamera({ onlyIfCut: true });
    this.requestRender();
  };

  // ---------- Рендеринг по запросу ----------

  /**
   * Просим нарисовать кадр. Если кадр уже запланирован — второй не создаём.
   * Поэтому нет постоянного цикла: когда ничего не меняется, видеокарта отдыхает.
   */
  requestRender = () => {
    if (this.disposed || this.frameId !== null) return;
    this.frameId = requestAnimationFrame(this.renderFrame);
  };

  // now — время кадра в мс, его передаёт requestAnimationFrame
  renderFrame = (now) => {
    this.frameId = null;
    const doorMoving = this.updateDoor(now);
    this.lastFrameTime = doorMoving ? now : null;

    // Пока камера «доезжает» по инерции (damping), update() вызывает событие 'change',
    // которое запросит следующий кадр. Когда движение затухнет — кадры прекратятся.
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);

    // Дверца ещё движется — нужен следующий кадр
    if (doorMoving) this.requestRender();
  };

  // ---------- Очистка ----------

  removeObject(object) {
    if (!object) return;
    this.scene.remove(object);
    disposeObject(object);
  }

  /** Полностью освобождает ресурсы. Вызывается при размонтировании React-компонента. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.removeEventListener('change', this.requestRender);
    this.controls.dispose(); // снимает обработчики мыши/тача с canvas

    this.removeObject(this.cabinet);
    this.removeObject(this.dimensionLines);
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.materials.dispose();
    this.keyLight.dispose(); // освобождает карту теней
    this.fillLight.dispose();
    this.hemiLight.dispose();
    this.scene.clear();

    this.renderer.dispose();
    this.renderer.forceContextLoss(); // сразу отдаём WebGL-контекст браузеру
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
