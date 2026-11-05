import * as THREE from 'three';

/**
 * Low-poly bar stool in the same flat-shaded oak-and-iron language as the desk.
 * Units are meters. `seatHeight` is the front edge of the seat (default 66 cm).
 * The curled back lip sits 11 cm above that, and the frame scales with it.
 * Footprint stays 50 cm deep by 43 cm wide.
 */
export function createStool({
  seatHeight = 0.66,
  woodColor = '#d09a52',
  metalColor = '#3c424c',
} = {}) {
  const params = { seatHeight, woodColor, metalColor };
  const scale = seatHeight / 0.66;
  const y = (value) => value * scale;

  const metal = new THREE.MeshStandardMaterial({
    color: metalColor,
    roughness: 0.72,
    metalness: 0.18,
    flatShading: true,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
  });
  const wood = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.02,
    flatShading: true,
  });

  const root = new THREE.Group();
  root.name = 'stool';

  const seat = new THREE.Mesh(createSeatShell(woodColor, scale), wood);
  seat.name = 'seat';
  seat.castShadow = true;
  root.add(seat);

  const tubeR = 0.008;
  const sides = 6;

  const frontTop = [
    new THREE.Vector3(-0.16, y(0.585), 0.1),
    new THREE.Vector3(0.16, y(0.585), 0.1),
  ];
  const backTop = [
    new THREE.Vector3(-0.15, y(0.66), -0.185),
    new THREE.Vector3(0.15, y(0.66), -0.185),
  ];
  const feet = [
    new THREE.Vector3(-0.215, y(0.012), 0.25),
    new THREE.Vector3(0.215, y(0.012), 0.25),
    new THREE.Vector3(-0.215, y(0.012), -0.25),
    new THREE.Vector3(0.215, y(0.012), -0.25),
  ];

  for (const side of [0, 1]) {
    const sign = side === 0 ? -1 : 1;
    addTube(root, feet[side], frontTop[side], tubeR, metal, sides);
    const elbow = new THREE.Vector3(sign * 0.16, y(0.598), 0.045);
    const railEnd = new THREE.Vector3(sign * 0.155, y(0.582), -0.09);
    addTube(root, frontTop[side], elbow, tubeR, metal, sides);
    addTube(root, elbow, railEnd, tubeR, metal, sides);
    addTube(root, feet[side + 2], backTop[side], tubeR, metal, sides);
    addCap(root, feet[side], capMat);
    addCap(root, feet[side + 2], capMat);
  }

  const hoop = [
    backTop[0],
    new THREE.Vector3(-0.11, y(0.71), -0.215),
    new THREE.Vector3(0, y(0.728), -0.228),
    new THREE.Vector3(0.11, y(0.71), -0.215),
    backTop[1],
  ];
  for (let i = 0; i < hoop.length - 1; i++) addTube(root, hoop[i], hoop[i + 1], tubeR, metal, sides);

  const restY = y(0.23);
  const frontRest = [pointAtY(feet[0], frontTop[0], restY), pointAtY(feet[1], frontTop[1], restY)];
  const backRest = [pointAtY(feet[2], backTop[0], restY), pointAtY(feet[3], backTop[1], restY)];
  addTube(root, frontRest[0], frontRest[1], tubeR, metal, sides);
  addTube(root, frontRest[0], backRest[0], tubeR, metal, sides);
  addTube(root, frontRest[1], backRest[1], tubeR, metal, sides);
  const stub = frontRest[1].clone().lerp(backRest[1], 0.45);
  addTube(root, stub, stub.clone().add(new THREE.Vector3(0.055, 0, 0)), tubeR, metal, sides);

  addTabs(root, metal, scale);

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    if (obj.material === metal) obj.receiveShadow = true;
  });

  function dispose() {
    const geometries = new Set();
    root.traverse((obj) => {
      if (obj.geometry && !geometries.has(obj.geometry)) {
        geometries.add(obj.geometry);
        obj.geometry.dispose();
      }
    });
    wood.dispose();
    metal.dispose();
    capMat.dispose();
  }

  return { object: root, params, dispose };
}

function addTabs(root, metal, scale) {
  const spots = [
    [-0.15, 0.05, 0.6],
    [0.15, 0.05, 0.6],
    [-0.15, -0.05, 0.592],
    [0.15, -0.05, 0.592],
  ];
  const plateGeo = new THREE.BoxGeometry(0.03, 0.012 * scale, 0.02);
  const screwGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.007 * scale, 5);
  for (const [x, z, underside] of spots) {
    const plate = new THREE.Mesh(plateGeo, metal);
    plate.name = 'mount-tab';
    const top = underside * scale;
    plate.position.set(x, top - 0.008 * scale, z);
    root.add(plate);
    const screw = new THREE.Mesh(screwGeo, metal);
    screw.name = 'mount-screw';
    screw.position.set(x, top - 0.002 * scale, z);
    root.add(screw);
  }
}

function addCap(root, foot, material) {
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), material);
  cap.name = 'foot-cap';
  cap.position.set(foot.x, 0.008, foot.z);
  cap.scale.y = 0.65;
  root.add(cap);
}

function addTube(root, a, b, radius, material, sides) {
  const start = a instanceof THREE.Vector3 ? a : new THREE.Vector3(...a);
  const end = b instanceof THREE.Vector3 ? b : new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = Math.max(dir.length(), 1e-4);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length + radius * 0.65, sides), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.multiplyScalar(1 / length));
  root.add(mesh);
  return mesh;
}

function pointAtY(a, b, y) {
  const t = THREE.MathUtils.clamp((y - a.y) / (b.y - a.y), 0, 1);
  return a.clone().lerp(b, t);
}

function createSeatShell(woodColor, scale) {
  const base = new THREE.Color(woodColor);
  const top = base.clone().offsetHSL(0.008, 0.05, 0.06);
  const edge = base.clone().offsetHSL(-0.005, 0.03, -0.1);
  const under = base.clone().offsetHSL(-0.01, -0.02, -0.16);

  const stations = [
    { z: -0.19, y: 0.74, thick: 0.015, halfW: 0.15 },
    { z: -0.155, y: 0.77, thick: 0.016, halfW: 0.175 },
    { z: -0.11, y: 0.70, thick: 0.018, halfW: 0.20 },
    { z: -0.045, y: 0.648, thick: 0.021, halfW: 0.212 },
    { z: 0.015, y: 0.632, thick: 0.022, halfW: 0.215 },
    { z: 0.08, y: 0.648, thick: 0.017, halfW: 0.212 },
    { z: 0.135, y: 0.658, thick: 0.014, halfW: 0.205 },
    { z: 0.19, y: 0.66, thick: 0.012, halfW: 0.19 },
  ].map((station) => ({
    ...station,
    y: station.y * scale,
    thick: station.thick * scale,
  }));
  const us = [-1, -0.64, -0.26, 0.26, 0.64, 1];

  const positions = [];
  const colors = [];

  function crown(u) {
    const a = Math.abs(u);
    if (a > 0.78) return -0.016 * scale * ((a - 0.78) / 0.22);
    return 0.005 * scale * a;
  }

  function sample(si, ui, bottom) {
    const station = stations[si];
    const u = us[ui];
    const py = station.y + crown(u) - (bottom ? station.thick : 0);
    return [u * station.halfW, py, station.z];
  }

  function add(a, b, c, color, want) {
    const ax = b[0] - a[0];
    const ay = b[1] - a[1];
    const az = b[2] - a[2];
    const bx = c[0] - a[0];
    const by = c[1] - a[1];
    const bz = c[2] - a[2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const tri = nx * want[0] + ny * want[1] + nz * want[2] < 0 ? [a, c, b] : [a, b, c];
    for (const p of tri) {
      positions.push(p[0], p[1], p[2]);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let s = 0; s < stations.length - 1; s++) {
    for (let u = 0; u < us.length - 1; u++) {
      const t00 = sample(s, u, false);
      const t10 = sample(s, u + 1, false);
      const t11 = sample(s + 1, u + 1, false);
      const t01 = sample(s + 1, u, false);
      add(t00, t10, t11, top, [0, 1, 0]);
      add(t00, t11, t01, top, [0, 1, 0]);
      const b00 = sample(s, u, true);
      const b10 = sample(s, u + 1, true);
      const b11 = sample(s + 1, u + 1, true);
      const b01 = sample(s + 1, u, true);
      add(b00, b11, b10, under, [0, -1, 0]);
      add(b00, b01, b11, under, [0, -1, 0]);
    }
  }

  const rim = (si, ui, sj, uj) => {
    const a = sample(si, ui, false);
    const b = sample(sj, uj, false);
    const c = sample(sj, uj, true);
    const d = sample(si, ui, true);
    const mx = (a[0] + b[0]) * 0.5;
    const mz = (a[2] + b[2]) * 0.5;
    const want = [mx, 0, mz];
    add(a, b, c, edge, want);
    add(a, c, d, edge, want);
  };

  for (let s = 0; s < stations.length - 1; s++) {
    rim(s, 0, s + 1, 0);
    rim(s, us.length - 1, s + 1, us.length - 1);
  }
  for (let u = 0; u < us.length - 1; u++) {
    rim(0, u, 0, u + 1);
    rim(stations.length - 1, u, stations.length - 1, u + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
