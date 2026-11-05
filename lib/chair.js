import * as THREE from 'three';

/**
 * Low-poly DYVLINGE-style armless swivel lounge chair.
 * Units are meters. `rotation` is the swivel angle in radians.
 * Proportions follow the line drawing: 63 wide, 75 deep, 69 tall,
 * seat top at 42 cm, seat depth 47 cm.
 */
export function createChair({
  color = '#c8501a',
  baseColor = '#d5d8de',
  rotation = 0.45,
} = {}) {
  const params = { color, baseColor, rotation };
  const fabric = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const shellMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.88),
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const buttonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.62),
    roughness: 0.8,
    metalness: 0,
    flatShading: true,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.16,
    metalness: 0.92,
    flatShading: true,
    envMapIntensity: 1.15,
  });
  const jointMat = new THREE.MeshStandardMaterial({
    color: '#1c1c1c',
    roughness: 0.6,
    metalness: 0.2,
    flatShading: true,
  });

  const root = new THREE.Group();
  root.name = 'chair';
  root.rotation.y = rotation;

  const seatOpts = {
    width: 0.62,
    length: 0.48,
    thick: 0.14,
    quilt: 'soft',
    frontBulge: 0.045,
    round: 3.1,
  };
  const seat = new THREE.Mesh(createCushion(seatOpts), fabric);
  seat.name = 'seat';
  // +Z face becomes up; a small extra tilt lifts the rear into the backrest.
  seat.rotation.x = -Math.PI / 2 + 0.1;
  seat.position.set(0, 0.34, 0.03);
  root.add(seat);

  const backOpts = {
    width: 0.64,
    length: 0.5,
    thick: 0.15,
    quilt: 'tuft',
    frontBulge: 0,
    round: 2.7,
    buttons: [
      [-0.4, 0.5],
      [0.4, 0.5],
      [-0.4, 0.08],
      [0.4, 0.08],
    ],
  };
  const back = new THREE.Mesh(createCushion(backOpts), fabric);
  back.name = 'back';
  back.rotation.x = -0.64;
  back.position.set(0, 0.47, -0.21);
  root.add(back);
  addButtons(back, buttonMat, backOpts);

  const shell = new THREE.Mesh(createPod(), shellMat);
  shell.name = 'shell';
  shell.position.set(0, 0, -0.01);
  root.add(shell);

  const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.022, 8), jointMat);
  joint.name = 'swivel-joint';
  joint.position.set(0, 0.145, -0.01);
  root.add(joint);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.07, 8), chrome);
  column.name = 'column';
  column.position.set(0, 0.1, -0.01);
  root.add(column);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.028, 8), chrome);
  hub.name = 'hub';
  hub.position.set(0, 0.062, -0.01);
  root.add(hub);

  const spokeGeo = createSpoke();
  const glideGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.012, 6);
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.058, -0.01);
    pivot.rotation.y = (i / 5) * Math.PI * 2;
    const spoke = new THREE.Mesh(spokeGeo, chrome);
    spoke.name = 'spoke';
    spoke.rotation.z = -0.055;
    pivot.add(spoke);
    const glide = new THREE.Mesh(glideGeo, chrome);
    glide.name = 'glide';
    glide.position.set(0.3, -0.012, 0);
    spoke.add(glide);
    root.add(pivot);
  }

  root.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true;
  });

  function dispose() {
    const geometries = new Set();
    root.traverse((obj) => {
      if (obj.geometry && !geometries.has(obj.geometry)) {
        geometries.add(obj.geometry);
        obj.geometry.dispose();
      }
    });
    for (const material of [fabric, shellMat, buttonMat, chrome, jointMat]) material.dispose();
  }

  return { object: root, params, dispose };
}

function addButtons(back, material, opts) {
  const geo = new THREE.SphereGeometry(0.014, 6, 4);
  for (const [u, v] of opts.buttons) {
    const p = cushionPoint(u, v, opts);
    const button = new THREE.Mesh(geo, material);
    button.name = 'button';
    // Sit in the dimple, just proud of the valley floor.
    button.position.set(p.x, p.y, p.zTop + 0.006);
    back.add(button);
  }
}

/** Flat tapered spoke along +X, from the hub out to the glide. */
function createSpoke() {
  const x0 = 0.04;
  const x1 = 0.3;
  const y0 = -0.005;
  const y1 = 0.006;
  const w0 = 0.02;
  const w1 = 0.008;
  const positions = [];
  const v = (x, y, z) => [x, y, z];
  const A = v(x0, y1, -w0);
  const B = v(x1, y1, -w1);
  const C = v(x1, y1, w1);
  const D = v(x0, y1, w0);
  const E = v(x0, y0, -w0);
  const F = v(x1, y0, -w1);
  const G = v(x1, y0, w1);
  const H = v(x0, y0, w0);
  const quad = (a, b, c, d) => {
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  quad(A, D, C, B);
  quad(E, F, G, H);
  quad(A, B, F, E);
  quad(D, H, G, C);
  quad(A, E, H, D);
  quad(B, C, G, F);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

/**
 * Soft tapered bowl. Wide elliptical shoulder under the seat,
 * easing down to the swivel column. Y is up.
 */
function createPod() {
  const seg = 10;
  const rings = [
    { y: 0.3, rx: 0.26, rz: 0.18 },
    { y: 0.268, rx: 0.25, rz: 0.175 },
    { y: 0.24, rx: 0.21, rz: 0.15 },
    { y: 0.214, rx: 0.15, rz: 0.11 },
    { y: 0.19, rx: 0.09, rz: 0.068 },
    { y: 0.166, rx: 0.042, rz: 0.034 },
  ];
  const positions = [];
  const at = (ring, a) => [
    Math.cos(a) * ring.rx,
    ring.y,
    Math.sin(a) * ring.rz,
  ];
  const tri = (a, b, c) => positions.push(...a, ...b, ...c);
  for (let i = 0; i < rings.length - 1; i++) {
    for (let s = 0; s < seg; s++) {
      const a0 = (s / seg) * Math.PI * 2;
      const a1 = ((s + 1) / seg) * Math.PI * 2;
      const p00 = at(rings[i], a0);
      const p01 = at(rings[i], a1);
      const p11 = at(rings[i + 1], a1);
      const p10 = at(rings[i + 1], a0);
      tri(p00, p01, p11);
      tri(p00, p11, p10);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Pillowy cushion. Width along X, length along Y, thickness along Z.
 * The puffy face is +Z. `quilt` is `tuft` (2×2 buttons) or `soft`.
 */
function createCushion(opts) {
  const nx = 10;
  const ny = 8;
  const positions = [];

  function tri(a, b, c) {
    positions.push(...a, ...b, ...c);
  }
  function quad(a, b, c, d) {
    tri(a, b, c);
    tri(a, c, d);
  }
  function uv(i, j) {
    return [(i / nx) * 2 - 1, (j / ny) * 2 - 1];
  }

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const p00 = cushionPoint(...uv(i, j), opts);
      const p10 = cushionPoint(...uv(i + 1, j), opts);
      const p11 = cushionPoint(...uv(i + 1, j + 1), opts);
      const p01 = cushionPoint(...uv(i, j + 1), opts);
      quad(
        [p00.x, p00.y, p00.zTop],
        [p10.x, p10.y, p10.zTop],
        [p11.x, p11.y, p11.zTop],
        [p01.x, p01.y, p01.zTop],
      );
      quad(
        [p00.xBot, p00.yBot, p00.zBot],
        [p01.xBot, p01.yBot, p01.zBot],
        [p11.xBot, p11.yBot, p11.zBot],
        [p10.xBot, p10.yBot, p10.zBot],
      );
    }
  }

  for (let i = 0; i < nx; i++) {
    const a = cushionPoint(...uv(i, 0), opts);
    const b = cushionPoint(...uv(i + 1, 0), opts);
    quad([a.x, a.y, a.zTop], [a.xBot, a.yBot, a.zBot], [b.xBot, b.yBot, b.zBot], [b.x, b.y, b.zTop]);
    const c = cushionPoint(...uv(i, ny), opts);
    const d = cushionPoint(...uv(i + 1, ny), opts);
    quad([c.xBot, c.yBot, c.zBot], [c.x, c.y, c.zTop], [d.x, d.y, d.zTop], [d.xBot, d.yBot, d.zBot]);
  }
  for (let j = 0; j < ny; j++) {
    const a = cushionPoint(...uv(0, j), opts);
    const b = cushionPoint(...uv(0, j + 1), opts);
    quad([a.xBot, a.yBot, a.zBot], [a.x, a.y, a.zTop], [b.x, b.y, b.zTop], [b.xBot, b.yBot, b.zBot]);
    const c = cushionPoint(...uv(nx, j), opts);
    const d = cushionPoint(...uv(nx, j + 1), opts);
    quad([c.x, c.y, c.zTop], [c.xBot, c.yBot, c.zBot], [d.xBot, d.yBot, d.zBot], [d.x, d.y, d.zTop]);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** u, v in -1..1. Plan is a superellipse; the rim rolls into a thick welt. */
function cushionPoint(u, v, opts) {
  const { width, length, thick, quilt, frontBulge, round } = opts;
  const n = round;
  const ax = Math.abs(u);
  const ay = Math.abs(v);
  const radius = Math.pow(Math.pow(ax, n) + Math.pow(ay, n), 1 / n) || 0;
  const scale = 1 / Math.max(radius, 1);
  let x = u * scale * (width / 2);
  let y = v * scale * (length / 2);

  const edge = Math.min(1, radius);
  const rim = Math.max(0, (edge - 0.55) / 0.45);
  const s = rim * rim * (3 - 2 * rim);

  const front = Math.max(0, -v);
  const bulge = (frontBulge || 0) * Math.pow(front, 1.45);
  y -= bulge * (0.35 + 0.65 * s);

  const dome = quiltHeight(u, v, quilt, opts.buttons) * (1 - s * 0.85);
  let zTop = thick * 0.5 * (1 - 0.62 * s) + dome;
  let zBot = -thick * 0.22 * (1 - 0.15 * s);
  // Front lip rolls outward and a little down.
  if (bulge) {
    zTop += bulge * 0.22 * (1 - s);
    zTop -= bulge * 0.35 * s;
  }
  // Bottom tucks inward so the cushion reads as a pillow and the pod shows beneath.
  const bScale = 1 - 0.42 * s;
  return { x, y, zTop, zBot, xBot: x * bScale, yBot: y * bScale };
}

function quiltHeight(u, v, quilt, buttons) {
  const dome = 0.02 * (1 - u * u * 0.45) * (1 - v * v * 0.35);
  if (quilt === 'tuft') {
    let z = dome;
    z -= 0.018 * Math.exp(-(u * u) / 0.01);
    z -= 0.016 * Math.exp(-((v - 0.29) * (v - 0.29)) / 0.012);
    for (const [su, sv] of buttons) {
      const d = Math.hypot((u - su) / 0.32, (v - sv) / 0.3);
      z -= 0.024 * Math.exp(-d * d * 2.6);
    }
    return z;
  }
  if (quilt === 'soft') {
    let z = dome * 0.85;
    z -= 0.007 * Math.exp(-(u * u) / 0.016);
    z -= 0.006 * Math.exp(-((v + 0.15) * (v + 0.15)) / 0.02);
    return z;
  }
  return dome * 0.6;
}
