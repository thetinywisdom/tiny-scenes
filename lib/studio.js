import * as THREE from 'three';

const FLOOR = new THREE.Color('#ddd6cb');
const FOG = new THREE.Color('#d5cfc4');

/** Soft floor, gradient backdrop, fog so the horizon falls away. */
export function addStudio(scene) {
  scene.background = makeGradientTexture('#f6f3ec', '#d5cfc4');
  scene.fog = new THREE.Fog(FOG, 7.5, 16);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({
      color: FLOOR,
      roughness: 1,
      metalness: 0,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';
  scene.add(floor);
  return { floor };
}

function makeGradientTexture(top, bottom) {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
