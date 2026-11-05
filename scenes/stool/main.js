import * as THREE from 'three';
import { runScene } from '../../lib/runScene.js';
import { createStool } from '../../lib/stool.js';
import { addStudio } from '../../lib/studio.js';

const SEAT_HEIGHT = 0.66;
const TARGET = new THREE.Vector3(0, 0.38, 0);

runScene({
  seed: 0x57001,
  orbit: true,
  orbitTarget: TARGET,
  minDistance: 0.7,
  maxDistance: 5,
  minCameraY: 0.08,
  hint: 'Drag to look · scroll to zoom · right-drag to pan · D for stats',
  setup(stage) {
    addStudio(stage.scene);
    const stool = createStool({
      seatHeight: SEAT_HEIGHT,
      woodColor: '#d09a52',
      metalColor: '#3c424c',
    });
    stage.scene.add(stool.object);
    return {
      apply() {},
      placeCamera(camera, aspect) {
        frameStool(camera, aspect, TARGET);
      },
    };
  },
});

function frameStool(camera, aspect, target) {
  const azimuth = THREE.MathUtils.degToRad(48);
  const elevation = THREE.MathUtils.degToRad(22);
  let dist = 2.15;
  if (aspect < 0.8) dist = 3.15;
  else if (aspect < 1.25) dist = 2.55;

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
