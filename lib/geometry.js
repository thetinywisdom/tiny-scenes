import * as THREE from 'three';

function facesOutward(a, b, c) {
  const ax = b[0] - a[0];
  const ay = b[1] - a[1];
  const az = b[2] - a[2];
  const bx = c[0] - a[0];
  const by = c[1] - a[1];
  const bz = c[2] - a[2];
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const cx = (a[0] + b[0] + c[0]) / 3;
  const cy = (a[1] + b[1] + c[1]) / 3;
  const cz = (a[2] + b[2] + c[2]) / 3;
  return nx * cx + ny * cy + nz * cz >= 0;
}

/**
 * Convex chamfered box centered on the origin. One bevel facet per edge
 * and a triangle per corner, so it stays low poly. Winding is corrected
 * so every face points outward. `colors` are THREE.Color instances.
 */
export function createChamferedBox(width, height, depth, chamfer, colors) {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const c = Math.min(chamfer, x * 0.45, y * 0.45, z * 0.45);
  const xi = x - c;
  const yi = y - c;
  const zi = z - c;

  const positions = [];
  const colorArr = [];

  function push(a, b, d, color) {
    for (const p of [a, b, d]) {
      positions.push(p[0], p[1], p[2]);
      colorArr.push(color.r, color.g, color.b);
    }
  }

  function tri(a, b, d, color) {
    if (facesOutward(a, b, d)) push(a, b, d, color);
    else push(a, d, b, color);
  }

  function quad(a, b, d, e, color) {
    if (facesOutward(a, b, d)) {
      push(a, b, d, color);
      push(a, d, e, color);
    } else {
      push(a, d, b, color);
      push(a, e, d, color);
    }
  }

  const { py, ny, px, nx, pz, nz, bevel } = colors;

  quad([-xi, y, -zi], [xi, y, -zi], [xi, y, zi], [-xi, y, zi], py);
  quad([-xi, -y, zi], [xi, -y, zi], [xi, -y, -zi], [-xi, -y, -zi], ny);
  quad([-xi, -yi, z], [xi, -yi, z], [xi, yi, z], [-xi, yi, z], pz);
  quad([xi, -yi, -z], [-xi, -yi, -z], [-xi, yi, -z], [xi, yi, -z], nz);
  quad([x, -yi, zi], [x, -yi, -zi], [x, yi, -zi], [x, yi, zi], px);
  quad([-x, -yi, -zi], [-x, -yi, zi], [-x, yi, zi], [-x, yi, -zi], nx);

  const signs = [1, -1];

  for (const sy of signs) {
    for (const sz of signs) {
      quad(
        [-xi, sy * y, sz * zi],
        [xi, sy * y, sz * zi],
        [xi, sy * yi, sz * z],
        [-xi, sy * yi, sz * z],
        bevel,
      );
    }
  }

  for (const sx of signs) {
    for (const sy of signs) {
      quad(
        [sx * xi, sy * y, -zi],
        [sx * x, sy * yi, -zi],
        [sx * x, sy * yi, zi],
        [sx * xi, sy * y, zi],
        bevel,
      );
    }
  }

  for (const sx of signs) {
    for (const sz of signs) {
      quad(
        [sx * xi, yi, sz * z],
        [sx * x, yi, sz * zi],
        [sx * x, -yi, sz * zi],
        [sx * xi, -yi, sz * z],
        bevel,
      );
    }
  }

  for (const sx of signs) {
    for (const sy of signs) {
      for (const sz of signs) {
        tri(
          [sx * xi, sy * y, sz * zi],
          [sx * xi, sy * yi, sz * z],
          [sx * x, sy * yi, sz * zi],
          bevel,
        );
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArr, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Box whose length runs from `a` to `b`. Local X is thickness, local Z is width. */
export function boxBetween(a, b, thickness, width, material) {
  const start = a instanceof THREE.Vector3 ? a : new THREE.Vector3(...a);
  const end = b instanceof THREE.Vector3 ? b : new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = Math.max(dir.length(), 1e-4);
  const yAxis = dir.multiplyScalar(1 / length);
  let xAxis = new THREE.Vector3(1, 0, 0);
  if (Math.abs(yAxis.dot(xAxis)) > 0.95) xAxis = new THREE.Vector3(0, 0, 1);
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();

  const geometry = new THREE.BoxGeometry(thickness, length, width);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
  return mesh;
}
