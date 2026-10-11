import * as THREE from 'three';

const SUNRISE = 6;
const SUNSET = 20;
const MAX_ELEVATION = THREE.MathUtils.degToRad(58);
const MORNING_AZIMUTH = THREE.MathUtils.degToRad(80);
const EVENING_AZIMUTH = THREE.MathUtils.degToRad(20);

const SUN_HIGH = new THREE.Color('#fff4e3');
const SUN_LOW = new THREE.Color('#ff9a52');
const SKY_DAY = new THREE.Color('#bdd6ec');
const SKY_SUNSET = new THREE.Color('#f0ad78');
const SKY_NIGHT = new THREE.Color('#283048');

const { clamp, lerp, smoothstep } = THREE.MathUtils;

export function getDaylight(hours) {
  const progress = clamp((hours - SUNRISE) / (SUNSET - SUNRISE), 0, 1);
  const elevation = Math.sin(Math.PI * progress) * MAX_ELEVATION;
  const azimuth = lerp(MORNING_AZIMUTH, EVENING_AZIMUTH, progress);
  const height = elevation / MAX_ELEVATION;
  const dusk = smoothstep(hours, SUNSET - 0.6, SUNSET + 0.8);

  const direction = new THREE.Vector3(
    -Math.cos(elevation) * Math.cos(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.sin(azimuth),
  ).normalize();

  const sunColor = SUN_LOW.clone().lerp(SUN_HIGH, smoothstep(height, 0.05, 0.6));
  const skyColor = SKY_SUNSET.clone()
    .lerp(SKY_DAY, smoothstep(height, 0.15, 0.55))
    .lerp(SKY_NIGHT, dusk);
  const daylight = smoothstep(height, 0, 0.5);

  return {
    direction,
    sunColor,
    skyColor,
    sunIntensity: 4.2 * smoothstep(height, 0, 0.22),
    environmentIntensity: 0.14 + 0.34 * daylight,
    ambientIntensity: 0.12 + 0.24 * daylight,
    lampIntensity: 7 * smoothstep(hours, 17.5, 20),
    exposure: 1 + 0.2 * dusk,
  };
}
