import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { runScene } from '../../lib/runScene.js';
import { createChair } from '../../lib/chair.js';
import { addStudio } from '../../lib/studio.js';

const TARGET = new THREE.Vector3(0, 0.32, 0);

runScene({
  seed: 0xc4a12,
  orbit: true,
  orbitTarget: TARGET,
  minDistance: 0.8,
  maxDistance: 5,
  minCameraY: 0.08,
  hint: 'Drag to look · scroll to zoom · right-drag to pan · D for stats',
  setup(stage) {
    addStudio(stage.scene);
    const pmrem = new THREE.PMREMGenerator(stage.renderer);
    stage.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
    pmrem.dispose();

    const chair = createChair({
      color: '#8f3812',
      baseColor: '#d5d8de',
      rotation: 0.42,
    });
    stage.scene.add(chair.object);
    return {
      apply() {},
      placeCamera(camera, aspect) {
        frameChair(camera, aspect, TARGET);
      },
    };
  },
});

function frameChair(camera, aspect, target) {
  const azimuth = THREE.MathUtils.degToRad(40);
  const elevation = THREE.MathUtils.degToRad(14);
  let dist = 2.35;
  if (aspect < 0.8) dist = 3.4;
  else if (aspect < 1.25) dist = 2.95;

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
