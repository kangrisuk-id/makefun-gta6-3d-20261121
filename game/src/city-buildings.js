// Palmera Bay's layout and construction: the road grid, city blocks, low-poly buildings with
// procedural window textures, palm trees, streetlights, the beach, the ocean and the pier.
// Everything is generated in code — no image files, no downloads.
import * as THREE from 'three';
import { range, intRange, pick } from './random.js';

/** Vertical avenues (constant x, running north–south) and horizontal streets (constant z). */
export const AVENUES_X = [-250, -125, 0, 125, 250];
export const STREETS_Z = [-170, -55, 60, 175];
export const ROAD_W = 20;
export const WORLD = { minX: -320, maxX: 330, minZ: -240, maxZ: 240 };
export const BEACH_X = 282;
export const CLINIC_POS = { x: -6, z: -78 };
export const GARAGE_POS = { x: -190, z: -112 };
export const WAREHOUSE_POS = { x: -196, z: 116 };
export const PIER_POS = { x: 306, z: 60 };

const DISTRICTS = [
  { name: 'Solano Yards', test: (x, z) => x < -125 && z < 0 },
  { name: 'Old Market', test: (x, z) => x < -125 && z >= 0 },
  { name: 'Downtown Palmera', test: (x, z) => x < 125 && z < 60 },
  { name: 'Coral Heights', test: (x, z) => x < 125 && z >= 60 },
  { name: 'Marina Palms', test: (x, z) => x < BEACH_X && z < 60 },
  { name: 'Loma Beach', test: () => true },
];
export function districtAt(x, z) {
  for (const d of DISTRICTS) if (d.test(x, z)) return d.name;
  return 'Palmera Bay';
}

/** Push a circle (x, z, radius) out of every building AABB; returns the corrected position. */
export function collideCircle(pos, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx, dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = nx + (dx / d) * radius;
        pos.z = nz + (dz / d) * radius;
      } else {
        const left = pos.x - c.minX, right = c.maxX - pos.x;
        const top = pos.z - c.minZ, bot = c.maxZ - pos.z;
        const m = Math.min(left, right, top, bot);
        if (m === left) pos.x = c.minX - radius;
        else if (m === right) pos.x = c.maxX + radius;
        else if (m === top) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      }
    }
  }
  pos.x = Math.max(WORLD.minX, Math.min(WORLD.maxX, pos.x));
  pos.z = Math.max(WORLD.minZ, Math.min(WORLD.maxZ, pos.z));
  return pos;
}

function windowTexture(random, base, litRatio) {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 120; y += 11) {
    for (let x = 5; x < 56; x += 11) {
      const lit = random() < litRatio;
      g.fillStyle = lit ? '#ffd98a' : 'rgba(20,26,38,0.85)';
      g.fillRect(x, y, 7, 7);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTexture(text, bg, fg) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 48;
  const g = cv.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 48);
  g.fillStyle = fg; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 25);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function roadTexture(horizontal) {
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  g.fillStyle = '#33333c'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#e8e4da';
  if (horizontal) {
    g.fillRect(0, 2, 64, 2); g.fillRect(0, 60, 64, 2);
    g.fillStyle = '#f7c948';
    g.fillRect(4, 31, 24, 2);
  } else {
    g.fillRect(2, 0, 2, 64); g.fillRect(60, 0, 2, 64);
    g.fillStyle = '#f7c948';
    g.fillRect(31, 4, 2, 24);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6844, roughness: 1 });
const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x2e9e5b, roughness: 1, side: THREE.DoubleSide });
const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 5.4, 5);
const frondGeo = new THREE.BoxGeometry(3.6, 0.06, 0.7);
export function makePalm(random) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(trunkGeo, palmTrunkMat);
  trunk.position.y = 2.7;
  trunk.rotation.z = range(random, -0.08, 0.08);
  trunk.castShadow = true;
  palm.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(frondGeo, palmLeafMat);
    const a = (i / 6) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.4, 5.6, Math.sin(a) * 1.4);
    frond.rotation.y = -a;
    frond.rotation.z = -0.5;
    frond.castShadow = true;
    palm.add(frond);
  }
  return palm;
}

/** Build the whole city into `scene`. Returns colliders, parking spots and animated bits. */
export function buildCity(scene, random) {
  const colliders = [];
  const parkedSpots = [];
  const group = new THREE.Group();
  scene.add(group);

  // Ground: city concrete, then sand, then the ocean.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.maxX - WORLD.minX, WORLD.maxZ - WORLD.minZ),
    new THREE.MeshStandardMaterial({ color: 0x776e60, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((WORLD.minX + WORLD.maxX) / 2, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(new THREE.PlaneGeometry(90, 560),
    new THREE.MeshStandardMaterial({ color: 0xe8cf9e, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(BEACH_X + 42, 0.01, 0);
  sand.receiveShadow = true;
  group.add(sand);

  const oceanCv = document.createElement('canvas');
  oceanCv.width = 128; oceanCv.height = 128;
  const og = oceanCv.getContext('2d');
  og.fillStyle = '#1b7f8e'; og.fillRect(0, 0, 128, 128);
  og.strokeStyle = 'rgba(160,240,235,0.35)'; og.lineWidth = 3;
  for (let i = 0; i < 8; i++) { og.beginPath(); og.moveTo(0, i * 18 + 6); og.lineTo(128, i * 18); og.stroke(); }
  const oceanTex = new THREE.CanvasTexture(oceanCv);
  oceanTex.wrapS = oceanTex.wrapT = THREE.RepeatWrapping;
  oceanTex.repeat.set(10, 10);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(420, 620),
    new THREE.MeshStandardMaterial({ map: oceanTex, color: 0x9fd8dd, roughness: 0.35, metalness: 0.1 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(BEACH_X + 48 + 210, 0.05, 0);
  group.add(ocean);

  // Roads: one textured strip per avenue and street.
  const roadTexBase = roadTexture(false);
  for (const x of AVENUES_X) {
    const tex = roadTexBase.clone();
    tex.needsUpdate = true; tex.repeat.set(1, 26);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 470),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.02, 0);
    road.receiveShadow = true;
    group.add(road);
  }
  const roadTexH = roadTexture(true);
  for (const z of STREETS_Z) {
    const tex = roadTexH.clone();
    tex.needsUpdate = true; tex.repeat.set(34, 1);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(600, ROAD_W),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    road.rotation.x = -Math.PI / 2;
    road.position.set(-15, 0.02, z);
    road.receiveShadow = true;
    group.add(road);
  }

  // Buildings in the blocks between roads.
  const bases = ['#c96f4a', '#b8b0a4', '#7fa3b8', '#d9a05b', '#a45a6e', '#8d9b6a', '#c2c8ce', '#e0b48c'];
  const textures = bases.map((b) => windowTexture(random, b, 0.4));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const xSegs = [[-312, -264], [-236, -139], [-111, -14], [14, 111], [139, 236], [264, 278]];
  const zSegs = [[-232, -184], [-156, -69], [-41, 46], [74, 161], [189, 232]];
  const signMakers = [
    { at: [2, 1], text: 'HOTEL SOL', bg: '#20304a', fg: '#ffd75e' },
    { at: [3, 2], text: 'BANCO AZUL', bg: '#123a5e', fg: '#ffffff' },
    { at: [1, 3], text: 'MERCADO', bg: '#5e2f12', fg: '#ffe9c9' },
    { at: [4, 1], text: 'GYM 24', bg: '#222222', fg: '#57e389' },
  ];
  for (let xi = 0; xi < xSegs.length; xi++) {
    for (let zi = 0; zi < zSegs.length; zi++) {
      const [x0, x1] = xSegs[xi], [z0, z1] = zSegs[zi];
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const isGarage = Math.abs(cx - GARAGE_POS.x) < 60 && Math.abs(cz - GARAGE_POS.z) < 60;
      const isWarehouse = Math.abs(cx - WAREHOUSE_POS.x) < 60 && Math.abs(cz - WAREHOUSE_POS.z) < 60;
      if (isWarehouse) {
        const wh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x9c6b52, roughness: 0.9 }));
        wh.scale.set(64, 13, 40); wh.position.set(cx - 6, 6.5, cz - 18);
        wh.castShadow = wh.receiveShadow = true;
        group.add(wh);
        colliders.push({ minX: cx - 38, maxX: cx + 26, minZ: cz - 38, maxZ: cz + 2 });
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(30, 5.6),
          new THREE.MeshBasicMaterial({ map: signTexture('SOLANO STORAGE', '#33241a', '#ffd75e') }));
        sign.position.set(cx - 6, 10.5, cz + 2.3); sign.rotation.y = 0;
        group.add(sign);
        for (let i = 0; i < 6; i++) {
          const crate = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xa9803e, roughness: 1 }));
          crate.scale.set(2.4, 2.4, 2.4);
          crate.position.set(cx - 30 + i * 9, 1.2, cz + 22);
          crate.castShadow = true;
          group.add(crate);
          colliders.push({ minX: crate.position.x - 1.2, maxX: crate.position.x + 1.2, minZ: crate.position.z - 1.2, maxZ: crate.position.z + 1.2 });
        }
        continue;
      }
      if (isGarage) {
        const lot = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0),
          new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 1 }));
        lot.rotation.x = -Math.PI / 2; lot.position.set(cx, 0.03, cz); lot.receiveShadow = true;
        group.add(lot);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(26, 5),
          new THREE.MeshBasicMaterial({ map: signTexture('SOLANO GARAGE', '#402020', '#ff8a5c') }));
        sign.position.set(cx, 6, z0 + 2); sign.rotation.y = Math.PI;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 6),
          new THREE.MeshStandardMaterial({ color: 0x555560 }));
        pole.position.set(cx, 3, z0 + 2);
        group.add(sign, pole);
        for (let i = 0; i < 4; i++) parkedSpots.push({ x: cx - 24 + i * 15, z: cz + 8, angle: 0 });
        continue;
      }
      const roll = random();
      if (roll < 0.14) { // a little park
        const grass = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0),
          new THREE.MeshStandardMaterial({ color: 0x5da24f, roughness: 1 }));
        grass.rotation.x = -Math.PI / 2; grass.position.set(cx, 0.03, cz); grass.receiveShadow = true;
        group.add(grass);
        for (let i = 0; i < 5; i++) {
          const palm = makePalm(random);
          palm.position.set(range(random, x0 + 6, x1 - 6), 0, range(random, z0 + 6, z1 - 6));
          group.add(palm);
        }
        continue;
      }
      if (roll < 0.26) { // a parking lot full of stealable cars
        const lot = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0),
          new THREE.MeshStandardMaterial({ color: 0x50505a, roughness: 1 }));
        lot.rotation.x = -Math.PI / 2; lot.position.set(cx, 0.03, cz); lot.receiveShadow = true;
        group.add(lot);
        const n = intRange(random, 3, 5);
        for (let i = 0; i < n; i++) parkedSpots.push({ x: x0 + 12 + i * 14, z: cz, angle: Math.PI / 2 });
        continue;
      }
      const count = (x1 - x0) > 80 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const w = range(random, 26, 40), d = range(random, 26, 40);
        const h = range(random, 13, 52) * (xi === 2 || xi === 3 ? 1.35 : 1);
        const bx = count === 1 ? cx : x0 + (x1 - x0) * (0.27 + 0.46 * i);
        const bz = cz + range(random, -6, 6);
        const tex = pick(random, textures);
        const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffbe78, emissiveMap: tex, emissiveIntensity: 0.38, roughness: 0.9 });
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d);
        b.position.set(bx, h / 2, bz);
        b.castShadow = b.receiveShadow = true;
        group.add(b);
        colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
        const signDef = signMakers.find((s) => s.at[0] === xi && s.at[1] === zi);
        if (signDef && i === 0) {
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(20, 3.8),
            new THREE.MeshBasicMaterial({ map: signTexture(signDef.text, signDef.bg, signDef.fg) }));
          sign.position.set(bx, h * 0.72, bz + d / 2 + 0.1);
          group.add(sign);
        }
      }
    }
  }

  // The clinic: Rio's respawn point, with a friendly red cross.
  const clinic = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0xe8e4da, roughness: 0.8 }));
  clinic.scale.set(22, 9, 14);
  clinic.position.set(CLINIC_POS.x - 16, 4.5, CLINIC_POS.z - 16);
  clinic.castShadow = clinic.receiveShadow = true;
  group.add(clinic);
  colliders.push({ minX: clinic.position.x - 11, maxX: clinic.position.x + 11, minZ: clinic.position.z - 7, maxZ: clinic.position.z + 7 });
  const clinicSign = new THREE.Mesh(new THREE.PlaneGeometry(17, 3.2),
    new THREE.MeshBasicMaterial({ map: signTexture('✚ CLÍNICA DEL SOL', '#f2f2f2', '#d23b4e') }));
  clinicSign.position.set(clinic.position.x, 7.6, clinic.position.z + 7.2);
  group.add(clinicSign);

  // Palms along the beach and the avenues.
  for (let z = -225; z < 235; z += 23) {
    const palm = makePalm(random);
    palm.position.set(BEACH_X + range(random, 2, 14), 0, z + range(random, -4, 4));
    group.add(palm);
  }
  for (const x of AVENUES_X) {
    for (let z = -210; z < 220; z += 55) {
      if (STREETS_Z.some((s) => Math.abs(s - z) < 16)) continue;
      const palm = makePalm(random);
      palm.position.set(x + ROAD_W / 2 + 3.4, 0, z);
      group.add(palm);
    }
  }

  // Streetlights: a pole and a glowing head, no real light source (the sun does the work).
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3c4148, roughness: 0.7, metalness: 0.4 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc46b, emissiveIntensity: 1.6 });
  const poleGeo = new THREE.CylinderGeometry(0.14, 0.18, 6.4, 5);
  const headGeo = new THREE.BoxGeometry(1.5, 0.22, 0.5);
  for (const x of AVENUES_X) {
    for (let z = -200; z < 230; z += 64) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 3.2; pole.castShadow = true;
      const head = new THREE.Mesh(headGeo, headMat); head.position.set(1, 6.4, 0);
      lamp.add(pole, head);
      lamp.position.set(x - ROAD_W / 2 - 1.6, 0, z);
      group.add(lamp);
    }
  }

  // The pier: planks out over the water at the end of the z=60 street.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x8a6844, roughness: 1 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(52, 1, 7), pierMat);
  pier.position.set(PIER_POS.x + 16, 0.8, PIER_POS.z);
  pier.castShadow = pier.receiveShadow = true;
  group.add(pier);
  for (let i = 0; i < 6; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.4, 5), pierMat);
    post.position.set(PIER_POS.x - 6 + i * 10, -0.4, PIER_POS.z + 3);
    group.add(post);
  }

  return { colliders, parkedSpots, oceanTex, group };
}
