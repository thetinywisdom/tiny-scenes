# tiny scenes

Stylized, procedural three.js scenes. Props and rigs are built in code. A scene's state is a pure function of the frame index (fixed seed, fixed timestep), so a render can step frame by frame without a real-time clock.

## Run

```bash
npm install
npx playwright install chromium
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The index lists every scene.

The desk scene (`/scenes/desk/`) starts in a 3/4 view with orbit controls on: drag to rotate, scroll or pinch to zoom, right-drag to pan. The polar angle stays above the floor. Press `D` (or open `?debug=1`) for the draw-call, triangle, and frame-time readout. On scenes that ship with orbit off, that same toggle turns orbit on.

## Add a scene

1. Create `scenes/<name>/index.html` and `scenes/<name>/main.js`.
2. Call `runScene` from `lib/runScene.js`. Pass `orbit: true` only if the scene should start with drag controls. Leave it off otherwise.
3. Build the set with modules from `lib/` (`createDesk`, `addStudio`, or new pieces). Drive motion from the sample passed to `apply(sample)` — `sample.t`, `sample.rise`, and `sample.seed` — so the same frame always looks the same.
4. Register the page in `vite.config.js` (`build.rollupOptions.input`) and add an entry to `scenes/manifest.js`.

`lib/timeline.js` is the clock. `lib/rng.js` is the seeded generator. `lib/setup.js` is the renderer, lights, and post stack.

## Render

The render script boots Vite, opens the scene in headless Chromium, and steps the timeline. Stills are PNG. Loops are H.264 MP4 (`yuv420p`).

```bash
# one frame, 1920×1080
npm run render -- desk --preset 1080p --still

# square still
npm run render -- desk --preset square --still

# vertical still (1080×1920)
npm run render -- desk --preset vertical --still

# 8 second loop at 30 fps (default)
npm run render -- desk --preset 1080p --seconds 8
```

Presets: `1080p` (1920×1080), `vertical` (1080×1920), `square` (1080×1080). Default fps is 30. Files land in `renders/`.

`--check` loads the index and the scene, fails on console errors, and drags, zooms, and pans the camera.

## Desk

`createDesk` in `lib/desk.js` builds an IDÅSEN-style sit-stand desk. Units are meters.

| param | default | |
| --- | --- | --- |
| `width` | `1.6` | top length |
| `depth` | `0.8` | top depth |
| `height` | `0.75` | floor to top surface, clamped to 0.63–1.27 |
| `woodColor` | `#d09a52` | flat oak, with a lighter top and darker edge |
| `metalColor` | `#3c424c` | flat dark iron |

The desk scene is a static shot at 75 cm. The columns are 8-sided, the feet 6-sided, and materials use flat shading. No animation is applied.

## Deploy

`.github/workflows/pages.yml` builds the site and deploys to GitHub Pages on pushes to `main`. In the repo settings, set Pages → Build and deployment → Source to **GitHub Actions** once. The project site is then:

https://thetinywisdom.github.io/tiny-scenes/

Local preview of the production build:

```bash
npm run build
npm run preview
```
