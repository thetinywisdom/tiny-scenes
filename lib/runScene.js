import { createTimeline } from './timeline.js';
import { createStage } from './setup.js';
import { createOrbit } from './orbit.js';
import { createDebug } from './debug.js';

/**
 * Boot a scene page.
 * `orbit: true` turns drag-orbit on for this scene. The shared default is off;
 * debug (D or ?debug=1) enables it temporarily and shows the draw-call readout.
 * `setup` returns `{ apply(sample), placeCamera(camera, aspect) }`.
 * `apply` is a pure function of the timeline sample. The desk scene ignores
 * the sample and stays still; animated scenes can read `sample.t` / `sample.rise`.
 */
export function runScene({
  orbit = false,
  orbitTarget,
  minDistance = 1.15,
  maxDistance = 6.5,
  minCameraY = 0.08,
  fps = 30,
  seconds = 8,
  seed = 1,
  hint = 'D for stats',
  setup,
}) {
  const canvas = document.querySelector('#view');
  const params = new URLSearchParams(location.search);
  const renderMode = params.get('render') === '1';
  const debugOn = params.get('debug') === '1';
  const timeline = createTimeline({
    fps: Number(params.get('fps')) || fps,
    seconds: Number(params.get('seconds')) || seconds,
    seed,
  });

  if (renderMode) document.body.classList.add('is-render');

  const hintEl = document.createElement('p');
  hintEl.className = 'hint';
  hintEl.textContent = hint;
  document.body.appendChild(hintEl);

  const stage = createStage(canvas, { renderMode });
  const api = setup(stage);

  function resize() {
    stage.setSize(window.innerWidth, window.innerHeight);
  }
  resize();

  const target = orbitTarget?.isVector3
    ? orbitTarget
    : orbitTarget
      ? { x: orbitTarget[0], y: orbitTarget[1], z: orbitTarget[2] }
      : { x: 0, y: 0.4, z: 0 };

  let userMoved = false;
  api.apply(timeline.sample(0));
  api.placeCamera?.(stage.camera, stage.camera.aspect);

  const view = createOrbit(stage.camera, canvas, {
    enabled: !renderMode && orbit,
    target,
    minDistance,
    maxDistance,
    minCameraY,
  });
  view.controls.addEventListener('start', () => {
    userMoved = true;
  });
  canvas.addEventListener('pointerdown', () => {
    userMoved = true;
  });
  canvas.addEventListener('wheel', () => {
    userMoved = true;
  }, { passive: true });

  const debug = createDebug({
    view,
    sceneWantsOrbit: !renderMode && orbit,
    initiallyOn: debugOn,
    renderMode,
  });

  window.addEventListener('resize', () => {
    resize();
    if (!userMoved) api.placeCamera?.(stage.camera, stage.camera.aspect);
    view.update();
  });

  function paint(frame) {
    api.apply(timeline.sample(frame));
    if (renderMode || !userMoved) api.placeCamera?.(stage.camera, stage.camera.aspect);
    if (!renderMode) view.update();
    return stage.render();
  }

  const gl = stage.renderer.getContext();
  const pixel = new Uint8Array(4);

  window.__stage = stage;
  window.__orbit = view;
  window.__timeline = {
    ready: false,
    fps: timeline.fps,
    frameCount: timeline.frameCount,
    seed: timeline.seed,
    setFrame(frame) {
      const stats = paint(frame);
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      gl.readPixels((w / 2) | 0, (h / 2) | 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return {
        ...stats,
        width: w,
        height: h,
        center: [pixel[0], pixel[1], pixel[2], pixel[3]],
      };
    },
  };

  const first = paint(0);
  debug.report(first);
  window.__timeline.ready = true;

  if (!renderMode) {
    let frameIndex = 0;
    let acc = 0;
    let last = performance.now();
    const step = 1 / timeline.fps;
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      while (acc >= step) {
        acc -= step;
        frameIndex = (frameIndex + 1) % timeline.frameCount;
      }
      const stats = paint(frameIndex);
      debug.report(stats);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
