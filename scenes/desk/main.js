import * as THREE from 'three';
import { runScene } from '../../lib/runScene.js';
import { createDesk } from '../../lib/desk.js';
import { addStudio } from '../../lib/studio.js';

const SITTING_HEIGHT = 0.75;
const TARGET = new THREE.Vector3(0, 0.4, 0);

runScene({
  seed: 0x1da5e,
  orbit: true,
  orbitTarget: TARGET,
  minDistance: 1.2,
  maxDistance: 7,
  minCameraY: 0.08,
  hint: 'Drag to look · scroll to zoom · right-drag to pan · D for stats',
  setup(stage) {
    addStudio(stage.scene);
    const desk = createDesk({
      width: 1.6,
      depth: 0.8,
      height: SITTING_HEIGHT,
      woodColor: '#d09a52',
      metalColor: '#3c424c',
    });
    stage.scene.add(desk.object);

    return {
      apply() {
        desk.setHeight(SITTING_HEIGHT);
      },
      placeCamera(camera, aspect) {
        frameDesk(camera, aspect, TARGET);
      },
    };
  },
});

function frameDesk(camera, aspect, target) {
  const azimuth = THREE.MathUtils.degToRad(42);
  const elevation = THREE.MathUtils.degToRad(22);
  let dist = 2.9;
  if (aspect < 0.8) dist = 5.35;
  else if (aspect < 1.25) dist = 4.95;

  const cosE = Math.cos(elevation);
  camera.fov = 28;
  camera.aspect = aspect;
  camera.position.set(
    target.x + Math.sin(azimuth) * cosE * dist,
    target.y + Math.sin(elevation) * dist,
    target.z + Math.cos(azimuth) * cosE * dist,
  );
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}
