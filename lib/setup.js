import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Renderer, studio lights, and a post stack (MSAA target + output pass).
 * Draw-call stats are captured on the scene pass. The output pass would
 * otherwise reset `renderer.info` to a single fullscreen quad.
 */
export function createStage(canvas, { renderMode = false } = {}) {
  const pixelRatio = renderMode ? 1 : Math.min(window.devicePixelRatio || 1, 2);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: renderMode,
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 80);

  addLights(scene);

  const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(Math.max(1, buffer.x), Math.max(1, buffer.y), {
    samples: 4,
    type: THREE.HalfFloatType,
  });
  const composer = new EffectComposer(renderer, target);

  const renderPass = new RenderPass(scene, camera);
  const sceneStats = { calls: 0, triangles: 0 };
  const renderScene = renderPass.render.bind(renderPass);
  renderPass.render = function renderAndCount(...args) {
    renderScene(...args);
    sceneStats.calls = renderer.info.render.calls;
    sceneStats.triangles = renderer.info.render.triangles;
  };
  composer.addPass(renderPass);
  composer.addPass(new OutputPass());

  function setSize(width, height) {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(pixelRatio);
    composer.setSize(w, h);
  }

  function render() {
    const t0 = performance.now();
    composer.render();
    let meshes = 0;
    let modelTriangles = 0;
    scene.traverse((obj) => {
      if (!obj.isMesh || !obj.geometry) return;
      const position = obj.geometry.getAttribute('position');
      if (!position) return;
      meshes += 1;
      const index = obj.geometry.index;
      modelTriangles += index ? index.count / 3 : position.count / 3;
    });
    return {
      draws: sceneStats.calls,
      triangles: sceneStats.triangles,
      modelTriangles,
      meshes,
      frameMs: performance.now() - t0,
    };
  }

  return { renderer, scene, camera, composer, setSize, render };
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff7ee, 0xc9c1b4, 0.7));

  const key = new THREE.DirectionalLight(0xfff3e4, 2.65);
  key.position.set(-2.7, 5.6, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  key.shadow.radius = 2;
  key.target.position.set(0, 0.25, 0);
  const shadowCam = key.shadow.camera;
  shadowCam.near = 0.4;
  shadowCam.far = 16;
  shadowCam.left = -3.2;
  shadowCam.right = 3.2;
  shadowCam.top = 3.2;
  shadowCam.bottom = -3.2;
  scene.add(key);
  scene.add(key.target);

  const fill = new THREE.DirectionalLight(0xe4ecf8, 0.8);
  fill.position.set(3.4, 2.1, 1.6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xfff0dc, 1.1);
  rim.position.set(0.8, 2.8, -3.6);
  scene.add(rim);
}
