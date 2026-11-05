import * as THREE from 'three';

/**
 * Low-poly DYVLINGE-style armless swivel lounge chair.
 * Units are meters. `rotation` is the swivel angle in radians.
 * Proportions follow the line drawing: 63 wide, 75 deep, 69 tall,
 * seat top at 42 cm, seat depth 47 cm.
 */
export function createChair({
  color = '#d9601e',
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
    color: new THREE.Color(color).offsetHSL(0, 0.02, -0.08),
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const buttonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).offsetHSL(0, 0.04, -0.16),
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

  const seat = new THREE.Mesh(
    createCushion({ width: 0.6, length: 0.47, thick: 0.15, quilt: 'soft' }),
    fabric,
  );
  seat.name = 'seat';
  seat.rotation.x = -Math.PI / 2;
  seat.position.set(0, 0.345, 0.04);
  root.add(seat);

  const back = new THREE.Mesh(
    createCushion({ width: 0.63, length: 0.46, thick: 0.13, quilt: 'tuft' }),
    fabric,
  );
  back.name = 'back';
  back.rotation.x = -0.82;
  back.position.set(0, 0.5, -0.2);
  root.add(back);
  addButtons(back, buttonMat);

  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.042, 0.16, 8), shellMat);
  shell.name = 'shell';
  shell.scale.set(1.2, 1, 1.45);
  shell.position.set(0, 0.22, -0.02);
  root.add(shell);

  const joint = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.022, 8), jointMat);
  joint.name = 'swivel-joint';
  joint.position.set(0, 0.145, -0.02);
  root.add(joint);

  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.07, 8), chrome);
  column.name = 'column';
  column.position.set(0, 0.1, -0.02);
  root.add(column);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.028, 8), chrome);
  hub.name = 'hub';
  hub.position.set(0, 0.062, -0.02);
  root.add(hub);

  const spokeGeo = createSpoke();
  const glideGeo = new THREE.CylinderGeometry(0.014, 0.016, 0.012, 6);
  for (let i = 0; i < 5; i++) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.058, -0.02);
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

function addButtons(back, material) {
  const geo = new THREE.SphereGeometry(0.016, 6, 5);
  for (const x of [-0.11, 0.11]) {
    for (const y of [-0.07, 0.075]) {
      const button = new THREE.Mesh(geo, material);
      button.name = 'button';
      button.position.set(x, y, 0.072);
      back.add(button);
    }
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
 * Rounded cushion. Width along X, length along Y, thickness along Z.
 * The puffy face is +Z. `quilt` is `tuft` (2×2 buttons) or `soft` (seat creases).
 */
function createCushion({ width, length, thick, quilt }) {
  const nx = 6;
  const ny = 5;
  const positions = [];

  function facePoint(i, j, sign) {
    const u = (i / nx) * 2 - 1;
    const v = (j / ny) * 2 - 1;
    const edge = Math.max(0, Math.max(Math.abs(u), Math.abs(v)) - 0.42) / 0.58;
    const inset = 1 - 0.22 * edge * edge;
    const x = u * (width / 2) * inset;
    const y = v * (length / 2) * inset;
    let z = sign * (thick / 2) * (1 - 0.5 * edge);
    if (sign > 0) z += puff(u, v, quilt) * (1 - edge);
    return [x, y, z];
  }

  function tri(a, b, c) {
    positions.push(...a, ...b, ...c);
  }
  function quad(a, b, c, d) {
    tri(a, b, c);
    tri(a, c, d);
  }

  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      quad(
        facePoint(i, j, 1),
        facePoint(i + 1, j, 1),
        facePoint(i + 1, j + 1, 1),
        facePoint(i, j + 1, 1),
      );
      quad(
        facePoint(i, j, -1),
        facePoint(i, j + 1, -1),
        facePoint(i + 1, j + 1, -1),
        facePoint(i + 1, j, -1),
      );
    }
  }

  for (let i = 0; i < nx; i++) {
    quad(facePoint(i, 0, 1), facePoint(i, 0, -1), facePoint(i + 1, 0, -1), facePoint(i + 1, 0, 1));
    quad(facePoint(i, ny, -1), facePoint(i, ny, 1), facePoint(i + 1, ny, 1), facePoint(i + 1, ny, -1));
  }
  for (let j = 0; j < ny; j++) {
    quad(facePoint(0, j, -1), facePoint(0, j, 1), facePoint(0, j + 1, 1), facePoint(0, j + 1, -1));
    quad(facePoint(nx, j, 1), facePoint(nx, j, -1), facePoint(nx, j + 1, -1), facePoint(nx, j + 1, 1));
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function puff(u, v, quilt) {
  if (quilt === 'tuft') {
    const crease = Math.min(Math.abs(u), Math.abs(v));
    let z = 0.02 - 0.03 * Math.exp(-crease * crease * 22);
    for (const s of [-1, 1]) {
      for (const t of [-1, 1]) {
        const d = Math.hypot(u - s * 0.36, v - t * 0.34);
        z -= 0.028 * Math.exp(-d * d * 55);
      }
    }
    return z;
  }
  if (quilt === 'soft') {
    const crease = Math.min(Math.abs(u), Math.abs(v * 0.65));
    return 0.016 - 0.01 * Math.exp(-crease * crease * 18);
  }
  return 0.01;
}
