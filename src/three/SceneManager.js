import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createMaterials } from './materials.js';
import { createCabinet, MM } from './createCabinet.js';
import { createDimensions } from './createDimensions.js';

const BACKGROUND = '#e4e5e7';
const DEFAULT_VIEW_DIRECTION = new THREE.Vector3(0.9, 0.62, 1.55).normalize();
const LIGHT_DIRECTION = new THREE.Vector3(-0.6, 1.35, 0.9).normalize();
const DIMENSION_MARGIN = 0.16;
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
    this.hasCameraView = false;
    this.doorTarget = 0;
    this.doorProgress = 0;
    this.doorAngle = 0;
    this.lastFrameTime = null;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initLights();
    this.initFloor();
    this.initDoorClick();
    this.materials = createMaterials(this.renderer.capabilities.getMaxAnisotropy());

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(container);
    this.handleResize();
  }

  initRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = renderer;
    this.container.appendChild(renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'viewer-labels';
    this.container.appendChild(this.labelRenderer.domElement);
  }

  initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    scene.fog = new THREE.Fog(BACKGROUND, 20, 45);
    this.scene = scene;
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 0.9;
    controls.minPolarAngle = 0.15;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.addEventListener('change', this.requestRender);
    this.controls = controls;
  }

  initLights() {
    this.hemiLight = new THREE.HemisphereLight('#ffffff', '#c9c4bc', 2.2);
    this.scene.add(this.hemiLight);

    const keyLight = new THREE.DirectionalLight('#ffffff', 2.4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);
    this.scene.add(keyLight.target);
    this.keyLight = keyLight;

    this.fillLight = new THREE.DirectionalLight('#ffffff', 0.45);
    this.fillLight.position.set(4, 3, -3);
    this.scene.add(this.fillLight);
  }

  initFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: '#d9dadc', roughness: 1, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.0005;
    floor.receiveShadow = true;
    this.floor = floor;
    this.scene.add(floor);
  }

  setDimensions(dimensions) {
    if (this.disposed) return;
    this.dimensions = { ...dimensions };

    this.removeObject(this.cabinet);
    this.removeObject(this.dimensionLines);

    this.cabinet = createCabinet(this.dimensions, this.materials, this.materialKey);
    this.dimensionLines = createDimensions(this.dimensions, this.materials.dimensionLine);
    this.scene.add(this.cabinet, this.dimensionLines);
    this.applyDoorAngle();

    this.updateShadowCamera();
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

  initDoorClick() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownPosition = null;

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
  }

  isPointerOverDoor(event) {
    const pivot = this.cabinet?.userData.doorPivot;
    if (!pivot) return false;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const [hit] = this.raycaster.intersectObject(this.cabinet, true);
    if (!hit) return false;

    for (let object = hit.object; object; object = object.parent) {
      if (object === pivot) return true;
    }
    return false;
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

    if (this.isPointerOverDoor(event)) this.toggleDoor();
  };

  handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    this.renderer.domElement.style.cursor = this.isPointerOverDoor(event)
      ? 'pointer'
      : '';
  };

  toggleDoor() {
    this.doorTarget = this.doorTarget === 1 ? 0 : 1;
    this.requestRender();
  }

  updateDoor(now) {
    if (this.doorProgress === this.doorTarget) return false;

    const delta = this.lastFrameTime === null ? 16 : now - this.lastFrameTime;
    const step = delta / DOOR_DURATION;
    this.doorProgress =
      this.doorTarget > this.doorProgress
        ? Math.min(this.doorTarget, this.doorProgress + step)
        : Math.max(this.doorTarget, this.doorProgress - step);

    this.applyDoorAngle();
    this.fitCamera({ onlyIfCut: true });
    return this.doorProgress !== this.doorTarget;
  }

  applyDoorAngle() {
    const pivot = this.cabinet?.userData.doorPivot;
    if (!pivot) return;
    const t = this.doorProgress;
    const eased = t * t * (3 - 2 * t);
    this.doorAngle = eased * DOOR_OPEN_ANGLE;
    pivot.rotation.y = -this.doorAngle;
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

    if (this.doorAngle > 0) {
      const edgeX = -W / 2 + W * Math.cos(this.doorAngle) - 0.05;
      const edgeZ = D / 2 + W * Math.sin(this.doorAngle) + 0.05;
      points.push(new THREE.Vector3(edgeX, 0, edgeZ), new THREE.Vector3(edgeX, H, edgeZ));
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

  updateShadowCamera() {
    const { W, H, D } = this.getSize();
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

  handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.fitCamera({ onlyIfCut: true });
    this.requestRender();
  };

  requestRender = () => {
    if (this.disposed || this.frameId !== null) return;
    this.frameId = requestAnimationFrame(this.renderFrame);
  };

  renderFrame = (now) => {
    this.frameId = null;
    const doorMoving = this.updateDoor(now);
    this.lastFrameTime = doorMoving ? now : null;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);

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
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.materials.dispose();
    this.keyLight.dispose();
    this.fillLight.dispose();
    this.hemiLight.dispose();
    this.scene.clear();

    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
