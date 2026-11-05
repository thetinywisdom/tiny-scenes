import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Orbit controls, off unless a scene asks for them.
 * Polar angle is clamped each frame so the camera stays above the floor
 * even while zooming and panning.
 */
export function createOrbit(camera, dom, {
  enabled = false,
  target = new THREE.Vector3(0, 0.4, 0),
  minDistance = 1.15,
  maxDistance = 6.5,
  minPolarAngle = 0.04,
  minCameraY = 0.08,
} = {}) {
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.85;
  controls.panSpeed = 0.7;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.minPolarAngle = minPolarAngle;
  controls.maxPolarAngle = Math.PI / 2;
  controls.target.copy(target);
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.enabled = enabled;
  controls.update();

  dom.addEventListener('contextmenu', (event) => {
    if (controls.enabled) event.preventDefault();
  });

  return {
    controls,
    get enabled() {
      return controls.enabled;
    },
    setEnabled(on) {
      controls.enabled = on;
      if (on) controls.update();
    },
    setTarget(next) {
      controls.target.copy(next);
      controls.update();
    },
    update() {
      if (!controls.enabled) return;
      if (controls.target.y < 0.05) controls.target.y = 0.05;
      const distance = Math.max(0.001, camera.position.distanceTo(controls.target));
      const cosLimit = THREE.MathUtils.clamp((minCameraY - controls.target.y) / distance, -0.999, 0.999);
      controls.maxPolarAngle = Math.acos(cosLimit);
      controls.update();
      if (camera.position.y < minCameraY) camera.position.y = minCameraY;
    },
  };
}
