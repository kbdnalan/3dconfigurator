import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createMaterials } from './materials.js';
import { createCabinet, MM } from './createCabinet.js';
import { createDimensions } from './createDimensions.js';
import { createRoom, getRoomSize, ROOM_HEIGHT, WALL_CLEARANCE } from './createRoom.js';
import { getDaylight } from './daylight.js';

const DEFAULT_VIEW_DIRECTION = new THREE.Vector3(1.15, 0.55, 1).normalize();
const DEFAULT_ZOOM_OUT = 1.3;
const DIMENSION_MARGIN = 0.16;
const WALL_MARGIN = 0.1;
const CABINET_MARGIN = 0.08;
const FLOOR_MARGIN = 0.12;
const MAX_BELOW_CENTER_ANGLE = THREE.MathUtils.degToRad(20);
const SUN_DISTANCE = 12;
const CEILING_CLEARANCE = 0.25;
const DOOR_OPEN_ANGLE = THREE.MathUtils.degToRad(100);
const OPEN_DURATION = 600;
const RETARGET_DURATION = 450;
const CLICK_TOLERANCE = 5;

const ease = (t) => t * t * (3 - 2 * t);

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.isCSS2DObject) child.element.remove();
  });
}

function isLowPowerDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

export class SceneManager {
  constructor(container, { onPlacementChange } = {}) {
    this.container = container;
    this.onPlacementChange = onPlacementChange;
    this.lowPower = isLowPowerDevice();
    this.frameId = null;
    this.disposed = false;
    this.dimensions = null;
    this.construction = { style: 'doors', shelves: 1 };
    this.materialKey = 'white';
    this.cabinet = null;
    this.dimensionLines = null;
    this.room = null;
    this.dimensionsVisible = true;
    this.timeOfDay = 15;
    this.mode = 'rotate';
    this.hasCameraView = false;
    this.openStates = new Map();
    this.lastFrameTime = null;
    this.shadowsDirty = true;
    this.retarget = null;
    this.drag = null;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initPostprocessing();
    this.initPointer();
    this.materials = createMaterials(this.renderer.capabilities.getMaxAnisotropy());

    this.placement = new THREE.Group();
    this.placement.name = 'placement';
    this.scene.add(this.placement);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(container);
    this.handleResize();
  }

  initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.lowPower ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    this.renderer = renderer;
    this.container.appendChild(renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'viewer-labels';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  initScene() {
    RectAreaLightUniformsLib.init();
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
    controls.addEventListener('change', this.requestRender);
    this.controls = controls;
  }

  initLights() {
    this.ambientLight = new THREE.HemisphereLight('#f4f1ec', '#b3a693', 0.3);
    this.scene.add(this.ambientLight);

    const sun = new THREE.DirectionalLight('#ffffff', 1);
    sun.castShadow = true;
    const size = this.lowPower ? 1024 : 2048;
    sun.shadow.mapSize.set(size, size);
    sun.shadow.radius = 4;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  initPostprocessing() {
    const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: this.lowPower ? 2 : 4,
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
    this.aoPass.enabled = !this.lowPower;
    this.composer.addPass(this.aoPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  setDimensions(dimensions) {
    if (this.disposed) return;
    this.dimensions = { ...dimensions };
    this.updateRoom();
    this.rebuildCabinet();
    this.setPlacementPosition(this.placement.position.x, this.placement.position.z);
    this.applyDaylight();
    this.fitCamera();
    this.requestRender();
  }

  setConstruction(construction) {
    if (this.disposed) return;
    this.construction = { ...construction };
    if (!this.dimensions) return;
    this.rebuildCabinet();
    this.fitCamera({ onlyIfCut: true });
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

  setMode(mode) {
    if (this.disposed) return;
    this.mode = mode;
    const moving = mode === 'move';
    this.controls.mouseButtons = {
      LEFT: moving ? null : THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: moving ? THREE.MOUSE.ROTATE : null,
    };
    this.controls.touches = {
      ONE: moving ? null : THREE.TOUCH.ROTATE,
      TWO: moving ? THREE.TOUCH.DOLLY_ROTATE : THREE.TOUCH.DOLLY_PAN,
    };
    this.renderer.domElement.style.cursor = moving ? 'grab' : '';
  }

  setPlacement(x, z) {
    if (this.disposed || !this.dimensions) return;
    const current = this.placement.position;
    if (Math.abs(current.x - x) < 1e-4 && Math.abs(current.z - z) < 1e-4) return;
    const before = current.clone();
    this.setPlacementPosition(x, z);
    const delta = current.clone().sub(before);
    this.controls.target.add(delta);
    this.camera.position.add(delta);
    this.controls.update();
    this.requestRender();
  }

  resetView() {
    if (this.disposed) return;
    this.hasCameraView = false;
    this.retarget = null;
    this.fitCamera();
    this.requestRender();
  }

  rebuildCabinet() {
    this.disposePlacementChildren();

    this.cabinet = createCabinet(
      this.dimensions,
      this.construction,
      this.materials,
      this.materialKey,
    );
    this.dimensionLines = createDimensions(this.dimensions, this.materials.dimensionLine);
    this.dimensionLines.visible = this.dimensionsVisible;
    this.placement.add(this.cabinet, this.dimensionLines);

    const previous = this.openStates;
    this.openStates = new Map(
      this.cabinet.userData.movables.map(({ userData: { key } }) => [
        key,
        previous.get(key) ?? { target: 0, progress: 0 },
      ]),
    );
    this.applyOpenStates();
    this.shadowsDirty = true;
  }

  disposePlacementChildren() {
    for (const child of [this.cabinet, this.dimensionLines]) {
      if (!child) continue;
      this.placement.remove(child);
      disposeObject(child);
    }
  }

  updateRoom() {
    const { width, depth } = getRoomSize(this.dimensions.width, this.dimensions.depth);
    const size = this.room?.userData;
    if (size && size.width === width && size.depth === depth) return;

    this.disposeRoom();
    this.room = createRoom(this.materials, width, depth, this.lowPower ? 512 : 1024);
    this.materials.floor.map.repeat.set(width, depth);
    this.scene.add(this.room);
    this.updateSunShadow(width, depth);
    this.shadowsDirty = true;
  }

  updateSunShadow(width, depth) {
    const extent = Math.hypot(width, depth, ROOM_HEIGHT) / 2 + 0.3;
    const camera = this.sun.shadow.camera;
    camera.left = -extent;
    camera.right = extent;
    camera.top = extent;
    camera.bottom = -extent;
    camera.near = 0.5;
    camera.far = SUN_DISTANCE + extent * 2;
    camera.updateProjectionMatrix();
  }

  disposeRoom() {
    if (!this.room) return;
    this.room.userData.lampLight.dispose();
    this.room.userData.windowLight.dispose();
    this.scene.remove(this.room);
    disposeObject(this.room);
    this.room = null;
  }

  getPlacementLimit() {
    const { W, D } = this.getSize();
    const { innerLimit } = this.room.userData;
    return {
      x: Math.max(0, innerLimit.x - W / 2 - WALL_CLEARANCE),
      z: Math.max(0, innerLimit.z - D / 2 - WALL_CLEARANCE),
    };
  }

  setPlacementPosition(x, z) {
    const limit = this.getPlacementLimit();
    const clampedX = THREE.MathUtils.clamp(x, -limit.x, limit.x);
    const clampedZ = THREE.MathUtils.clamp(z, -limit.z, limit.z);
    this.placement.position.set(clampedX, 0, clampedZ);
    this.shadowsDirty = true;

    if (Math.abs(clampedX - x) > 1e-4 || Math.abs(clampedZ - z) > 1e-4) {
      this.reportPlacement();
    }
  }

  reportPlacement() {
    const { x, z } = this.placement.position;
    this.onPlacementChange?.({
      x: Math.round(x * 1000) / 1000,
      z: Math.round(z * 1000) / 1000,
    });
  }

  applyDaylight() {
    if (!this.room) return;
    const light = getDaylight(this.timeOfDay);
    const center = new THREE.Vector3(0, ROOM_HEIGHT / 2, 0);

    this.sun.position.copy(center).addScaledVector(light.direction, SUN_DISTANCE);
    this.sun.target.position.copy(center);
    this.sun.target.updateMatrixWorld();
    this.sun.color.copy(light.sunColor);
    this.sun.intensity = light.sunIntensity;
    this.sun.shadow.autoUpdate = light.sunIntensity > 0;

    const { lampLight, windowLight } = this.room.userData;
    windowLight.color.copy(light.windowColor);
    windowLight.intensity = Math.max(0, light.windowIntensity);
    lampLight.intensity = light.lampIntensity;
    lampLight.shadow.autoUpdate = light.lampIntensity > 0;

    this.scene.background.copy(light.skyColor);
    this.scene.environmentIntensity = light.environmentIntensity;
    this.ambientLight.intensity = light.ambientIntensity;
    this.materials.sky.color.copy(light.skyTint);
    this.materials.bulb.emissiveIntensity = light.lampIntensity * 0.6;
    this.renderer.toneMappingExposure = light.exposure;
    this.shadowsDirty = true;
  }

  initPointer() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.floorPoint = new THREE.Vector3();
    this.pointerDown = null;

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown, { capture: true });
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
  }

  setRayFromEvent(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.viewCamera);
  }

  getMovableUnderPointer(event) {
    const movables = this.cabinet?.userData.movables;
    if (!movables?.length) return null;
    this.setRayFromEvent(event);

    const [hit] = this.raycaster.intersectObject(this.cabinet, true);
    if (!hit) return null;
    for (let object = hit.object; object; object = object.parent) {
      if (movables.includes(object)) return object;
    }
    return null;
  }

  getFloorPoint(event) {
    this.setRayFromEvent(event);
    return this.raycaster.ray.intersectPlane(this.floorPlane, this.floorPoint)?.clone();
  }

  handlePointerDown = (event) => {
    if (!event.isPrimary) {
      this.cancelDrag();
      this.pointerDown = null;
      return;
    }
    this.pointerDown = { x: event.clientX, y: event.clientY };

    if (this.mode !== 'move' || !this.dimensions || event.button !== 0) return;
    const floorPoint = this.getFloorPoint(event);
    if (!floorPoint) return;
    this.drag = {
      pointerId: event.pointerId,
      startFloor: floorPoint,
      startPlacement: this.placement.position.clone(),
      moved: false,
    };
    this.renderer.domElement.setPointerCapture?.(event.pointerId);
    this.renderer.domElement.style.cursor = 'grabbing';
  };

  handlePointerMove = (event) => {
    if (this.drag && event.pointerId === this.drag.pointerId) {
      const moved = Math.hypot(
        event.clientX - this.pointerDown.x,
        event.clientY - this.pointerDown.y,
      );
      if (!this.drag.moved && moved <= CLICK_TOLERANCE) return;
      this.drag.moved = true;

      const floorPoint = this.getFloorPoint(event);
      if (!floorPoint) return;
      const next = this.drag.startPlacement
        .clone()
        .add(floorPoint.sub(this.drag.startFloor));
      this.setPlacementPosition(next.x, next.z);
      this.requestRender();
      return;
    }

    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    const overMovable = Boolean(this.getMovableUnderPointer(event));
    const idle = this.mode === 'move' ? 'grab' : '';
    this.renderer.domElement.style.cursor = overMovable ? 'pointer' : idle;
  };

  handlePointerUp = (event) => {
    const start = this.pointerDown;
    const drag = this.drag;
    this.pointerDown = null;
    this.drag = null;
    if (this.mode === 'move') this.renderer.domElement.style.cursor = 'grab';
    if (!start || !event.isPrimary) return;

    if (drag?.moved) {
      this.reportPlacement();
      this.startRetarget();
      return;
    }

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > CLICK_TOLERANCE) return;
    const part = this.getMovableUnderPointer(event);
    if (part) this.toggleOpen(part.userData.key);
  };

  handlePointerCancel = () => {
    this.cancelDrag();
    this.pointerDown = null;
  };

  cancelDrag() {
    if (!this.drag) return;
    if (this.drag.moved) {
      this.reportPlacement();
      this.startRetarget();
    }
    this.drag = null;
    if (this.mode === 'move') this.renderer.domElement.style.cursor = 'grab';
  }

  startRetarget() {
    const { H } = this.getSize();
    const to = this.placement.position.clone().setY(H / 2);
    this.retarget = { from: this.controls.target.clone(), to, startedAt: null };
    this.requestRender();
  }

  updateRetarget(now) {
    if (!this.retarget) return false;
    if (this.retarget.startedAt === null) this.retarget.startedAt = now;
    const t = Math.min(1, (now - this.retarget.startedAt) / RETARGET_DURATION);
    this.controls.target.lerpVectors(this.retarget.from, this.retarget.to, ease(t));
    if (t >= 1) {
      this.retarget = null;
      this.fitCamera({ onlyIfCut: true });
      return false;
    }
    return true;
  }

  toggleOpen(key) {
    const state = this.openStates.get(key);
    if (!state) return;
    state.target = state.target === 1 ? 0 : 1;
    this.requestRender();
  }

  updateOpenStates(now) {
    const delta = this.lastFrameTime === null ? 16 : now - this.lastFrameTime;
    const step = delta / OPEN_DURATION;
    let changed = false;
    let moving = false;

    for (const state of this.openStates.values()) {
      if (state.progress === state.target) continue;
      state.progress =
        state.target > state.progress
          ? Math.min(state.target, state.progress + step)
          : Math.max(state.target, state.progress - step);
      changed = true;
      if (state.progress !== state.target) moving = true;
    }

    if (!changed) return false;
    this.applyOpenStates();
    this.shadowsDirty = true;
    this.fitCamera({ onlyIfCut: true });
    return moving;
  }

  applyOpenStates() {
    for (const part of this.cabinet?.userData.movables ?? []) {
      const data = part.userData;
      data.amount = ease(this.openStates.get(data.key)?.progress ?? 0);
      if (data.type === 'door') {
        part.rotation.y = data.sign * data.amount * DOOR_OPEN_ANGLE;
      } else {
        part.position.z = data.closedZ + data.amount * data.travel;
      }
    }
  }

  getSize() {
    const { width, height, depth } = this.dimensions;
    return { W: width * MM, H: height * MM, D: depth * MM };
  }

  getFitDistance(direction, localTarget) {
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

    for (const part of this.cabinet?.userData.movables ?? []) {
      const { type, amount = 0 } = part.userData;
      if (amount <= 0) continue;
      if (type === 'door') {
        const { hingeX, sign, width } = part.userData;
        const angle = amount * DOOR_OPEN_ANGLE;
        const edgeX = hingeX - sign * width * Math.cos(angle);
        const edgeZ = D / 2 + width * Math.sin(angle) + 0.05;
        points.push(
          new THREE.Vector3(edgeX, 0, edgeZ),
          new THREE.Vector3(edgeX, H, edgeZ),
        );
      } else {
        const z = D / 2 + amount * part.userData.travel + 0.05;
        points.push(new THREE.Vector3(-W / 2, 0, z), new THREE.Vector3(W / 2, H, z));
      }
    }

    let distance = 0;
    for (const point of points) {
      const offset = point.sub(localTarget);
      const depth = offset.dot(direction);
      distance = Math.max(
        distance,
        depth + Math.abs(offset.dot(right)) / tanH,
        depth + Math.abs(offset.dot(up)) / tanV,
      );
    }
    return { radius, distance: distance * 1.08 };
  }

  getCeilingSafeView(preferred, localTarget, zoom = 1) {
    let direction = preferred.clone();
    let fit = this.getFitDistance(direction, localTarget);
    const maxRise = ROOM_HEIGHT - CEILING_CLEARANCE - localTarget.y;

    if (direction.y * fit.distance * zoom > maxRise) {
      const y = THREE.MathUtils.clamp(maxRise / (fit.distance * zoom), -0.2, 1);
      direction = new THREE.Vector3(direction.x, 0, direction.z)
        .normalize()
        .multiplyScalar(Math.sqrt(1 - y * y))
        .setY(y);
      fit = this.getFitDistance(direction, localTarget);
    }
    return { direction, ...fit };
  }

  fitCamera({ onlyIfCut = false } = {}) {
    if (!this.dimensions) return;
    const { H } = this.getSize();
    const localTarget = new THREE.Vector3(0, H / 2, 0);
    const target = this.placement.position.clone().add(localTarget);

    const preferred = this.hasCameraView
      ? this.camera.position.clone().sub(this.controls.target).normalize()
      : DEFAULT_VIEW_DIRECTION;
    const zoom = this.hasCameraView ? 1 : DEFAULT_ZOOM_OUT;
    const currentDistance = this.camera.position.distanceTo(this.controls.target);
    const { direction, radius, distance } = this.getCeilingSafeView(
      preferred,
      localTarget,
      zoom,
    );

    this.controls.minDistance = Math.min(radius * 1.1, distance);
    this.controls.maxDistance = Math.max(distance * 1.6, radius * 2);
    this.updateFloorLimit(distance);

    if (onlyIfCut && this.hasCameraView && currentDistance >= distance) {
      this.controls.update();
      return;
    }

    if (!this.retarget) this.controls.target.copy(target);
    this.camera.position
      .copy(this.controls.target)
      .addScaledVector(direction, distance * zoom);
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
    const position = this.cameraOffset.copy(this.camera.position);

    if (this.room) {
      const { width, depth } = this.room.userData;
      const { clamp } = THREE.MathUtils;
      position.x = clamp(position.x, -width / 2 + WALL_MARGIN, width / 2 - WALL_MARGIN);
      position.z = clamp(position.z, -depth / 2 + WALL_MARGIN, depth / 2 - WALL_MARGIN);
      position.y = clamp(position.y, this.getFloorLimit(), ROOM_HEIGHT - WALL_MARGIN);
      this.pushOutOfCabinet(position, width, depth);
    }

    this.viewCamera.position.copy(position);
    if (position.equals(this.camera.position)) {
      this.viewCamera.quaternion.copy(this.camera.quaternion);
    } else {
      this.viewCamera.lookAt(target);
    }
    this.viewCamera.updateMatrixWorld();
  }

  pushOutOfCabinet(position, roomWidth, roomDepth) {
    if (!this.dimensions) return;
    const { W, H, D } = this.getSize();
    const margin = CABINET_MARGIN;
    const center = this.placement.position;
    const min = new THREE.Vector3(
      center.x - W / 2 - margin,
      0,
      center.z - D / 2 - margin,
    );
    const max = new THREE.Vector3(
      center.x + W / 2 + margin,
      H + margin,
      center.z + D / 2 + margin,
    );
    const inside =
      position.x > min.x &&
      position.x < max.x &&
      position.y < max.y &&
      position.z > min.z &&
      position.z < max.z;
    if (!inside) return;

    const exits = [
      {
        axis: 'y',
        value: max.y,
        cost: max.y - position.y,
        ok: max.y < ROOM_HEIGHT - WALL_MARGIN,
      },
      {
        axis: 'x',
        value: min.x,
        cost: position.x - min.x,
        ok: min.x > -roomWidth / 2 + WALL_MARGIN,
      },
      {
        axis: 'x',
        value: max.x,
        cost: max.x - position.x,
        ok: max.x < roomWidth / 2 - WALL_MARGIN,
      },
      {
        axis: 'z',
        value: min.z,
        cost: position.z - min.z,
        ok: min.z > -roomDepth / 2 + WALL_MARGIN,
      },
      {
        axis: 'z',
        value: max.z,
        cost: max.z - position.z,
        ok: max.z < roomDepth / 2 - WALL_MARGIN,
      },
    ].filter((exit) => exit.ok);
    if (!exits.length) return;

    const best = exits.reduce((a, b) => (b.cost < a.cost ? b : a));
    position[best.axis] = best.value;
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
    const opening = this.updateOpenStates(now);
    const retargeting = this.updateRetarget(now);
    this.lastFrameTime = opening ? now : null;

    this.controls.update();
    this.updateViewCamera();
    if (this.shadowsDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowsDirty = false;
    }
    this.composer.render();
    this.labelRenderer.render(this.scene, this.viewCamera);

    if (opening || retargeting) this.requestRender();
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    if (this.frameId !== null) cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.removeEventListener('change', this.requestRender);
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown, { capture: true });
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.handlePointerCancel);

    this.disposePlacementChildren();
    this.disposeRoom();
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
