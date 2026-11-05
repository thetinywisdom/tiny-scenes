import * as THREE from 'three';
import { boxBetween, createChamferedBox } from './geometry.js';

/** Floor to top surface, in meters. Matches the IDÅSEN range. */
export const DESK_MIN_HEIGHT = 0.63;
export const DESK_MAX_HEIGHT = 1.27;

const TOP_THICKNESS = 0.03;
const BRACKET_H = 0.016;
const COLUMN_SIDES = 8;

/**
 * Low-poly IDÅSEN-style electric sit-stand desk.
 * Units are meters. `height` is floor to top surface and is clamped
 * to the real 63–127 cm range. Legs are faceted iron; the top is a
 * chamfered slab with a subtle two-tone vertex color, not a grain map.
 */
export function createDesk({
  width = 1.6,
  depth = 0.8,
  height = 0.75,
  woodColor = '#d09a52',
  metalColor = '#3c424c',
} = {}) {
  const params = { width, depth, height, woodColor, metalColor };

  const inset = Math.min(0.18, Math.max(0.12, width * 0.1));
  const colX = width / 2 - inset;
  const footHalf = Math.min(depth * 0.4, depth / 2 - 0.05);
  const outerR = 0.034;
  const innerR = 0.025;
  const footBarR = 0.016;
  const padH = 0.016;
  const padR = 0.04;
  const footBarY = padH + footBarR;
  const outerBottom = footBarY - footBarR * 0.45;
  const outerTop = 0.4;
  const outerH = outerTop - outerBottom;
  const hubY = outerBottom + outerH * 0.64;
  const innerBottom = outerTop - 0.075;

  const wood = woodMaterial(woodColor);
  const metal = new THREE.MeshStandardMaterial({
    color: metalColor,
    roughness: 0.72,
    metalness: 0.18,
    flatShading: true,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    roughness: 0.95,
    metalness: 0,
    flatShading: true,
  });
  const plastic = new THREE.MeshStandardMaterial({
    color: '#2a2d33',
    roughness: 0.7,
    metalness: 0.05,
    flatShading: true,
  });
  const plasticLite = new THREE.MeshStandardMaterial({
    color: '#5c616a',
    roughness: 0.6,
    metalness: 0.08,
    flatShading: true,
  });

  const root = new THREE.Group();
  root.name = 'desk';

  const moving = new THREE.Group();
  moving.name = 'desk-top';
  root.add(moving);

  const top = new THREE.Mesh(
    createChamferedBox(width, TOP_THICKNESS, depth, 0.005, woodTones(woodColor)),
    wood,
  );
  top.name = 'top';
  top.position.y = -TOP_THICKNESS / 2;
  varyTopFace(top.geometry, TOP_THICKNESS / 2);
  moving.add(top);

  const crossH = 0.036;
  const cross = new THREE.Mesh(new THREE.BoxGeometry(colX * 2, crossH, 0.03), metal);
  cross.name = 'crossbar';
  cross.position.set(0, -TOP_THICKNESS - BRACKET_H - crossH / 2 + 0.004, 0.08);
  moving.add(cross);

  for (const side of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.14, BRACKET_H, 0.2), metal);
    plate.name = 'bracket';
    plate.position.set(side * colX, -TOP_THICKNESS - BRACKET_H / 2, 0);
    moving.add(plate);
    addLeg(root, {
      x: side * colX,
      footHalf,
      outerR,
      outerBottom,
      outerH,
      outerTop,
      hubY,
      footBarY,
      footBarR,
      padH,
      padR,
      metal,
      rubber,
    });
  }

  addController(moving, { width, depth, plastic, plasticLite });

  const innerGeo = new THREE.CylinderGeometry(innerR, innerR, 1, COLUMN_SIDES);
  const inners = [-1, 1].map((side) => {
    const tube = new THREE.Mesh(innerGeo, metal);
    tube.name = 'inner-column';
    tube.position.x = side * colX;
    tube.rotation.y = Math.PI / COLUMN_SIDES;
    root.add(tube);
    return tube;
  });

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    if (obj.material !== wood) obj.receiveShadow = true;
  });

  let currentHeight = null;

  function setHeight(next) {
    const h = THREE.MathUtils.clamp(next, DESK_MIN_HEIGHT, DESK_MAX_HEIGHT);
    if (h === currentHeight) return h;
    currentHeight = h;
    params.height = h;
    moving.position.y = h;
    const innerTop = h - TOP_THICKNESS - BRACKET_H;
    const innerH = Math.max(0.06, innerTop - innerBottom);
    for (const tube of inners) {
      tube.scale.y = innerH;
      tube.position.y = innerBottom + innerH / 2;
    }
    return h;
  }

  function dispose() {
    const geometries = new Set();
    root.traverse((obj) => {
      if (obj.geometry && !geometries.has(obj.geometry)) {
        geometries.add(obj.geometry);
        obj.geometry.dispose();
      }
    });
    for (const material of [wood, metal, rubber, plastic, plasticLite]) material.dispose();
  }

  setHeight(height);

  return { object: root, params, setHeight, dispose };
}

function addLeg(root, spec) {
  const {
    x, footHalf, outerR, outerBottom, outerH, outerTop, hubY,
    footBarY, footBarR, padH, padR, metal, rubber,
  } = spec;

  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(outerR, outerR, outerH, COLUMN_SIDES),
    metal,
  );
  outer.name = 'outer-column';
  outer.position.set(x, outerBottom + outerH / 2, 0);
  outer.rotation.y = Math.PI / COLUMN_SIDES;
  root.add(outer);

  const lip = new THREE.Mesh(
    new THREE.CylinderGeometry(outerR * 1.22, outerR * 1.22, 0.02, COLUMN_SIDES),
    metal,
  );
  lip.name = 'column-lip';
  lip.position.set(x, outerTop - 0.006, 0);
  lip.rotation.y = Math.PI / COLUMN_SIDES;
  root.add(lip);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(outerR * 1.3, outerR * 1.3, 0.03, COLUMN_SIDES),
    metal,
  );
  hub.name = 'strut-hub';
  hub.position.set(x, hubY, 0);
  hub.rotation.y = Math.PI / COLUMN_SIDES;
  root.add(hub);

  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(footBarR, footBarR, footHalf * 2, COLUMN_SIDES),
    metal,
  );
  bar.name = 'foot-bar';
  bar.rotation.x = Math.PI / 2;
  bar.position.set(x, footBarY, 0);
  root.add(bar);

  for (const end of [-1, 1]) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(padR * 0.92, padR, padH, 6),
      rubber,
    );
    pad.name = 'foot-pad';
    pad.position.set(x, padH / 2, end * footHalf);
    root.add(pad);

    const hubPoint = new THREE.Vector3(x, hubY, 0);
    const footPoint = new THREE.Vector3(x, footBarY, end * footHalf);
    const dir = footPoint.clone().sub(hubPoint).normalize();
    const strut = boxBetween(
      hubPoint.clone().addScaledVector(dir, outerR * 0.9),
      footPoint.clone().addScaledVector(dir, -footBarR * 0.55),
      0.013,
      0.036,
      metal,
    );
    strut.name = 'strut';
    root.add(strut);
  }
}

function addController(moving, { width, depth, plastic, plasticLite }) {
  const paddle = new THREE.Group();
  paddle.name = 'controller';
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.052), plastic);
  housing.name = 'controller-body';
  paddle.add(housing);
  for (const side of [-1, 1]) {
    const button = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.01), plasticLite);
    button.name = 'controller-button';
    button.position.set(side * 0.02, 0, 0.03);
    paddle.add(button);
  }
  paddle.position.set(width / 2 - 0.22, -TOP_THICKNESS - 0.016, depth / 2 - 0.002);
  moving.add(paddle);
}

function varyTopFace(geometry, topY) {
  const position = geometry.getAttribute('position');
  const color = geometry.getAttribute('color');
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(position.getY(i) - topY) > 0.001) continue;
    const along = position.getX(i) / 0.8;
    const across = position.getZ(i) / 0.4;
    const shift = 0.045 * across + 0.02 * along;
    color.setXYZ(
      i,
      Math.min(1, color.getX(i) * (1 + shift)),
      Math.min(1, color.getY(i) * (1 + shift * 0.85)),
      Math.min(1, color.getZ(i) * (1 + shift * 0.7)),
    );
  }
  color.needsUpdate = true;
}

function woodTones(hex) {
  const base = new THREE.Color(hex);
  return {
    py: base.clone().offsetHSL(0.008, 0.05, 0.06),
    ny: base.clone().offsetHSL(-0.01, -0.02, -0.18),
    px: base.clone().offsetHSL(-0.008, 0.03, -0.12),
    nx: base.clone().offsetHSL(-0.008, 0.03, -0.14),
    pz: base.clone().offsetHSL(-0.004, 0.04, -0.1),
    nz: base.clone().offsetHSL(-0.006, 0.02, -0.13),
    bevel: base.clone().offsetHSL(0.002, 0.03, -0.03),
  };
}

function woodMaterial() {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0.02,
    flatShading: true,
  });
}
