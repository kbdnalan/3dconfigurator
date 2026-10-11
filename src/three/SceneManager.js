import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createMaterials } from './materials.js';
import { createCabinet, MM } from './createCabinet.js';
import { createDimensions } from './createDimensions.js';
import {
  createRoom,
  ROOM_DEPTH,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  WALL_GAP,
} from './createRoom.js';
import { getDaylight } from './daylight.js';

const DEFAULT_VIEW_DIRECTION = new THREE.Vector3(1.15, 0.55, 1).normalize();
const DEFAULT_ZOOM_OUT = 1.3;
const DIMENSION_MARGIN = 0.16;
const WALL_MARGIN = 0.1;
const FLOOR_MARGIN = 0.12;
const MAX_BELOW_CENTER_ANGLE = THREE.MathUtils.degToRad(20);
const SUN_DISTANCE = 12;
const SHADOW_EXTENT = 4;
const DOOR_OPEN_ANGLE = THREE.MathUtils.degToRad(100);
const DOOR_DURATION = 600;
const CLICK_TOLERANCE = 5;

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.isCSS2DObject) child.element.remove();
  });
}

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.frameId = null;
    this.disposed = false;
    this.dimensions = null;
    this.materialKey = 'white';
    this.cabinet = null;
    this.dimensionLines = null;
    this.dimensionsVisible = true;
    this.timeOfDay = 15;
    this.hasCameraView = false;
    this.doorStates = new Map();
    this.lastFrameTime = null;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initPostprocessing();
    this.initDoorClick();
    this.materials = createMaterials(this.renderer.capabilities.getMaxAnisotropy());
    this.room = createRoom(this.materials);
    this.scene.add(this.room);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(container);
    this.handleResize();
  }

  initRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = renderer;
    this.container.appendChild(renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'viewer-labels';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnvironment = new RoomEnvironment();
    this.environmentMap = pmrem.fromScene(roomEnvironment, 0.04).texture;
    roomEnvironment.dispose();
    pmrem.dispose();
    scene.environment = this.environmentMap;

    this.scene = scene;
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 50);
    this.viewCamera = this.camera.clone();
    this.cameraOffset = new THREE.Vector3();

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.minPolarAngle = 0.15;
    controls.minAzimuthAngle = -Math.PI / 2;
    controls.maxAzimuthAngle = Math.PI / 2;
    controls.addEventListener('change', this.requestRender);
    this.controls = controls;
  }

  initLights() {
    this.ambientLight = new THREE.HemisphereLight('#f4f1ec', '#b3a693', 0.3);
    this.scene.add(this.ambientLight);

    const sun = new THREE.DirectionalLight('#ffffff', 1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 3;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    const shadowCamera = sun.shadow.camera;
    shadowCamera.left = -SHADOW_EXTENT;
    shadowCamera.right = SHADOW_EXTENT;
    shadowCamera.top = SHADOW_EXTENT;
    shadowCamera.bottom = -SHADOW_EXTENT;
    shadowCamera.near = 0.5;
    shadowCamera.far = SUN_DISTANCE + SHADOW_EXTENT * 2;
    shadowCamera.updateProjectionMatrix();
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  initPostprocessing() {
    const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.addPass(new RenderPass(this.scene, this.viewCamera));

    this.aoPass = new GTAOPass(this.scene, this.viewCamera, 1, 1);
    this.aoPass.output = GTAOPass.OUTPUT.Default;
    this.aoPass.updateGtaoMaterial({
      radius: 0.25,
      distanceExponent: 1,
      thickness: 1,
      scale: 1,
      samples: 12,
    });
    this.aoPass.updatePdMaterial({ radius: 6, rings: 2, samples: 12 });
    this.composer.addPass(this.aoPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  setDimensions(dimensions) {
    if (this.disposed) return;
    this.dimensions = { ...dimensions };

    this.removeObject(this.cabinet);
    this.removeObject(this.dimensionLines);

    this.cabinet = createCabinet(this.dimensions, this.materials, this.materialKey);
    this.dimensionLines = createDimensions(this.dimensions, this.materials.dimensionLine);
    this.dimensionLines.visible = this.dimensionsVisible;
    this.scene.add(this.cabinet, this.dimensionLines);

    const previousStates = this.doorStates;
    this.doorStates = new Map(
      this.cabinet.userData.doors.map(({ userData: { key } }) => [
        key,
        previousStates.get(key) ?? { target: 0, progress: 0 },
      ]),
    );
    this.applyDoorAngles();

    this.room.position.z = -this.getSize().D / 2 - WALL_GAP;
    this.applyDaylight();
    this.fitCamera();
    this.requestRender();
  }

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

  setTimeOfDay(hours) {
    if (this.disposed) return;
    this.timeOfDay = hours;
    this.applyDaylight();
    this.requestRender();
  }

  setDimensionsVisible(visible) {
    if (this.disposed) return;
    this.dimensionsVisible = visible;
    if (this.dimensionLines) this.dimensionLines.visible = visible;
    this.requestRender();
  }

  applyDaylight() {
    const light = getDaylight(this.timeOfDay);
    const center = new THREE.Vector3(
      0,
      ROOM_HEIGHT / 2,
      this.room.position.z + ROOM_DEPTH / 2,
    );

    this.sun.position.copy(center).addScaledVector(light.direction, SUN_DISTANCE);
    this.sun.target.position.copy(center);
    this.sun.target.updateMatrixWorld();
    this.sun.color.copy(light.sunColor);
    this.sun.intensity = light.sunIntensity;

    this.scene.background.copy(light.skyColor);
    this.scene.environmentIntensity = light.environmentIntensity;
    this.ambientLight.intensity = light.ambientIntensity;
    this.room.userData.lampLight.intensity = light.lampIntensity;
    this.materials.bulb.emissiveIntensity = light.lampIntensity * 0.6;
    this.renderer.toneMappingExposure = light.exposure;
  }

  initDoorClick() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownPosition = null;

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
  }

  getDoorUnderPointer(event) {
    const doors = this.cabinet?.userData.doors;
    if (!doors) return null;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.viewCamera);

    const [hit] = this.raycaster.intersectObject(this.cabinet, true);
    if (!hit) return null;

    for (let object = hit.object; object; object = object.parent) {
      if (doors.includes(object)) return object;
    }
    return null;
  }

  handlePointerDown = (event) => {
    this.pointerDownPosition = event.isPrimary
      ? { x: event.clientX, y: event.clientY }
      : null;
  };

  handlePointerUp = (event) => {
    const start = this.pointerDownPosition;
    this.pointerDownPosition = null;
    if (!start || !event.isPrimary) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > CLICK_TOLERANCE) return;

    const door = this.getDoorUnderPointer(event);
    if (door) this.toggleDoor(door.userData.key);
  };

  handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    this.renderer.domElement.style.cursor = this.getDoorUnderPointer(event)
      ? 'pointer'
      : '';
  };

  toggleDoor(key) {
    const state = this.doorStates.get(key);
    if (!state) return;
    state.target = state.target === 1 ? 0 : 1;
    this.requestRender();
  }

  updateDoors(now) {
    const delta = this.lastFrameTime === null ? 16 : now - this.lastFrameTime;
    const step = delta / DOOR_DURATION;
    let changed = false;
    let moving = false;

    for (const state of this.doorStates.values()) {
      if (state.progress === state.target) continue;
      state.progress =
        state.target > state.progress
          ? Math.min(state.target, state.progress + step)
          : Math.max(state.target, state.progress - step);
      changed = true;
      if (state.progress !== state.target) moving = true;
    }

    if (!changed) return false;
    this.applyDoorAngles();
    this.fitCamera({ onlyIfCut: true });
    return moving;
  }

  applyDoorAngles() {
    for (const pivot of this.cabinet?.userData.doors ?? []) {
      const { key, sign } = pivot.userData;
      const t = this.doorStates.get(key)?.progress ?? 0;
      const eased = t * t * (3 - 2 * t);
      pivot.userData.angle = eased * DOOR_OPEN_ANGLE;
      pivot.rotation.y = sign * pivot.userData.angle;
    }
  }

  getSize() {
    const { width, height, depth } = this.dimensions;
    return { W: width * MM, H: height * MM, D: depth * MM };
  }

  getFitDistance(direction, target) {
    const { W, H, D } = this.getSize();
    const m = DIMENSION_MARGIN;
    const radius = Math.sqrt(W * W + H * H + D * D) / 2 + m;

    const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const up = direction.clone().cross(right);
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const tanH = tanV * this.camera.aspect;

    const points = [];
    for (const x of [-W / 2 - m, W / 2 + m]) {
      for (const y of [0, H + m]) {
        for (const z of [-D / 2 - m, D / 2 + m]) {
          points.push(new THREE.Vector3(x, y, z));
        }
      }
    }

    for (const pivot of this.cabinet?.userData.doors ?? []) {
      const { angle = 0, hingeX, sign, width } = pivot.userData;
      if (angle <= 0) continue;
      const edgeX = hingeX - sign * width * Math.cos(angle);
      const edgeZ = D / 2 + width * Math.sin(angle) + 0.05;
      for (const x of [edgeX - 0.05, edgeX + 0.05]) {
        points.push(new THREE.Vector3(x, 0, edgeZ), new THREE.Vector3(x, H, edgeZ));
      }
    }

    let distance = 0;
    for (const point of points) {
      const offset = point.sub(target);
      const depth = offset.dot(direction);
      distance = Math.max(
        distance,
        depth + Math.abs(offset.dot(right)) / tanH,
        depth + Math.abs(offset.dot(up)) / tanV,
      );
    }
    return { radius, distance: distance * 1.08 };
  }

  fitCamera({ onlyIfCut = false } = {}) {
    if (!this.dimensions) return;
    const { H } = this.getSize();
    const target = new THREE.Vector3(0, H / 2, 0);

    const direction = this.hasCameraView
      ? this.camera.position.clone().sub(this.controls.target).normalize()
      : DEFAULT_VIEW_DIRECTION.clone();
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    const { radius, distance } = this.getFitDistance(direction, target);

    this.controls.minDistance = Math.min(radius * 1.1, distance);
    this.controls.maxDistance = Math.max(distance * 1.6, radius * 2);
    this.updateFloorLimit(distance);

    if (onlyIfCut && this.hasCameraView && currentDistance >= distance) {
      this.controls.update();
      return;
    }

    this.controls.target.copy(target);
    const zoom = this.hasCameraView ? 1 : DEFAULT_ZOOM_OUT;
    this.camera.position.copy(target).addScaledVector(direction, distance * zoom);
    this.hasCameraView = true;
    this.controls.update();
  }

  getFloorLimit() {
    return Math.min(FLOOR_MARGIN, this.getSize().H / 4);
  }

  updateFloorLimit(fitDistance) {
    const { H } = this.getSize();
    const belowCenter = Math.atan2(H / 2 - this.getFloorLimit(), fitDistance * 0.8);
    this.controls.maxPolarAngle =
      Math.PI / 2 + Math.min(Math.max(belowCenter, 0), MAX_BELOW_CENTER_ANGLE);
  }

  updateViewCamera() {
    const target = this.controls.target;
    const offset = this.cameraOffset.copy(this.camera.position).sub(target);
    let scale = 1;

    if (this.dimensions) {
      const backZ = this.room.position.z;
      const limit = (origin, delta, min, max) => {
        if (delta < 0 && origin + delta < min) return (min - origin) / delta;
        if (delta > 0 && origin + delta > max) return (max - origin) / delta;
        return 1;
      };
      scale = Math.min(
        limit(
          target.x,
          offset.x,
          -ROOM_WIDTH / 2 + WALL_MARGIN,
          ROOM_WIDTH / 2 - WALL_MARGIN,
        ),
        limit(target.z, offset.z, backZ + WALL_MARGIN, backZ + ROOM_DEPTH - WALL_MARGIN),
        limit(target.y, offset.y, this.getFloorLimit(), ROOM_HEIGHT - WALL_MARGIN),
      );
    }

    this.viewCamera.position.copy(target).addScaledVector(offset, Math.max(scale, 0));
    this.viewCamera.quaternion.copy(this.camera.quaternion);
    this.viewCamera.updateMatrixWorld();
  }

  handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
    for (const camera of [this.camera, this.viewCamera]) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    this.fitCamera({ onlyIfCut: true });
    this.requestRender();
  };

  requestRender = () => {
    if (this.disposed || this.frameId !== null) return;
    this.frameId = requestAnimationFrame(this.renderFrame);
  };

  renderFrame = (now) => {
    this.frameId = null;
    const doorMoving = this.updateDoors(now);
    this.lastFrameTime = doorMoving ? now : null;

    this.controls.update();
    this.updateViewCamera();
    this.composer.render();
    this.labelRenderer.render(this.scene, this.viewCamera);

    if (doorMoving) this.requestRender();
  };

  removeObject(object) {
    if (!object) return;
    this.scene.remove(object);
    disposeObject(object);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.removeEventListener('change', this.requestRender);
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointermove', this.handlePointerMove);

    this.removeObject(this.cabinet);
    this.removeObject(this.dimensionLines);
    this.room.userData.lampLight.dispose();
    this.removeObject(this.room);
    this.materials.dispose();
    this.environmentMap.dispose();
    this.sun.dispose();
    this.ambientLight.dispose();
    this.scene.clear();

    this.aoPass.dispose();
    this.outputPass.dispose();
    this.composer.dispose();

    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
