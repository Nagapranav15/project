// About page: the Banana Crew mascot from the brand guidelines, rendered realistically. A half-peeled banana
// (spotted peel, creamy flesh, hanging peel flaps) with glossy eyes, rubber-hose arms, cloth gloves, rubber-soled
// shoes and JUMPER trunks, lit like a studio product shot. Scroll poses it and picks its move (one per chapter:
// wave, thumbs-up, strut, a cheeky wiggle, a wink); drag spins it, tap squashes it, the cursor gets looked at and
// the dots recolour the trunks. Renders only while on screen. Built to assets/about-3d.js (`npm run build:about`).
import {
  BufferGeometry, CanvasTexture, CapsuleGeometry, CatmullRomCurve3, CircleGeometry, Color, CylinderGeometry,
  DirectionalLight, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  NeutralToneMapping, PerspectiveCamera, PMREMGenerator, Quaternion, RepeatWrapping, Scene, SphereGeometry,
  SRGBColorSpace, TorusGeometry, TubeGeometry, Vector3, WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// where the mascot stands and which move it does, per chapter (x and y in scene units, angles in radians)
const POSES = {
  hero: { x: 0.25, y: 0.12, ry: -0.25, rx: 0.05, s: 0.92, move: 'wave' },
  front: { x: 0.95, y: 0, ry: -0.35, rx: 0.05, s: 1, move: 'thumbs' },
  side: { x: 0.95, y: 0, ry: 0.9, rx: 0.04, s: 1, move: 'stroll' },
  back: { x: 0.95, y: 0, ry: Math.PI + 0.35, rx: 0.05, s: 1.05, move: 'wiggle' },
  band: { x: 1.0, y: 0.75, ry: -0.2, rx: 0.12, s: 1.75, move: 'wink' },
  spin: { x: 0, y: 0, ry: 0, rx: 0.08, s: 1.05, move: 'jump', spin: 1 }
};
const KEYS = ['x', 'y', 'ry', 'rx', 's', 'spin'];

const clamp = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const pop = (t) => { const c = 1.9, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const live = new Map();

/* ---------- textures ---------- */
function canvasTex(w, h, draw, wrap) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  if (wrap) t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
// ripe peel: warm yellow, fibres, darker ridges and sugar spots
const peelTex = () => canvasTex(1024, 256, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#c8b11c'); g.addColorStop(0.18, '#ecc214'); g.addColorStop(0.7, '#f3c616'); g.addColorStop(1, '#e9bb12');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 240; i++) {
    const y = Math.random() * H;
    x.strokeStyle = Math.random() < 0.5 ? 'rgba(255,245,190,0.08)' : 'rgba(150,110,20,0.07)';
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y + (Math.random() - 0.5) * 4); x.stroke();
  }
  for (let k = 0; k < 5; k++) {
    const y = (k / 5) * H + H / 10, rg = x.createLinearGradient(0, y - 6, 0, y + 6);
    rg.addColorStop(0, 'rgba(160,120,20,0)'); rg.addColorStop(0.5, 'rgba(160,120,20,0.3)'); rg.addColorStop(1, 'rgba(160,120,20,0)');
    x.fillStyle = rg; x.fillRect(0, y - 6, W, 12);
  }
  for (let i = 0; i < 120; i++) {
    const r = 0.6 + Math.random() * (Math.random() < 0.1 ? 3.5 : 1.6);
    x.fillStyle = `rgba(${70 + Math.random() * 30},${45 + Math.random() * 20},15,${0.35 + Math.random() * 0.5})`;
    x.beginPath(); x.ellipse(Math.random() * W, Math.random() * H, r * 1.6, r, 0, 0, Math.PI * 2); x.fill();
  }
}, true);
// flesh: creamy, faint lengthwise strings, a little warmer at the tip
const fleshTex = () => canvasTex(512, 256, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#f7ecc6'); g.addColorStop(0.75, '#f5e6b8'); g.addColorStop(1, '#e6cf92');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    const y = Math.random() * H;
    x.strokeStyle = Math.random() < 0.6 ? 'rgba(255,252,235,0.25)' : 'rgba(205,175,110,0.12)';
    x.lineWidth = 1 + Math.random(); x.beginPath(); x.moveTo(0, y); x.lineTo(W, y + (Math.random() - 0.5) * 6); x.stroke();
  }
}, true);
// woven JUMPER waistband
function bandTex() {
  const t = canvasTex(1024, 96, () => {}, true);
  const x = t.image.getContext('2d');
  const draw = () => {
    x.fillStyle = '#111111'; x.fillRect(0, 0, 1024, 96);
    x.fillStyle = '#CEFF05'; x.font = '600 52px Obv, Archivo, sans-serif'; x.textBaseline = 'alphabetic';
    const word = 'JUMPER', w = x.measureText(word).width + 50, n = Math.max(1, Math.round(1024 / w)), step = 1024 / n;
    for (let i = 0; i < n; i++) x.fillText(word, i * step + 25, 66);
    t.needsUpdate = true;
  };
  draw();
  if (document.fonts && document.fonts.load) document.fonts.load('600 52px Obv').then(draw, () => {});
  t.repeat.set(2, 1);
  return t;
}

/* ---------- geometry ---------- */
// sweeps a ring with soft banana ridges along a curve, from t0 to t1
function sweep(curve, radius, t0, t1, { segs = 70, sides = 48, ridge = 0.05 } = {}) {
  const pos = [], uv = [], idx = [];
  const frames = curve.computeFrenetFrames(segs, false);
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, t = lerp(t0, t1, u), P = curve.getPointAt(t), fi = Math.round(t * segs);
    const N = frames.normals[fi], B = frames.binormals[fi], r = radius(t);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2, k = r * (1 + ridge * Math.cos(5 * a));
      pos.push(P.x + (N.x * Math.cos(a) + B.x * Math.sin(a)) * k, P.y + (N.y * Math.cos(a) + B.y * Math.sin(a)) * k, P.z + (N.z * Math.cos(a) + B.z * Math.sin(a)) * k);
      uv.push(u, j / sides);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < sides; j++) {
    const a = i * (sides + 1) + j, b = a + sides + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a peel flap: flat, tapering and closed, arching out from the body and hanging down;
// yellow on the outside, pale on the inside
function flapGeometry() {
  const segs = 28, sides = 16, pos = [], col = [], idx = [];
  const outC = new Color('#efc015'), inC = new Color('#f4e7bf');
  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const out = 0.5 * Math.sin(u * Math.PI * 0.62), up = 0.22 * Math.sin(u * Math.PI * 0.9) - 0.95 * u * u;
    const w = 0.33 * Math.pow(1 - u, 0.9) + 0.05, th = 0.035 * (1 - 0.5 * u);
    const du = 0.01, out2 = 0.5 * Math.sin((u + du) * Math.PI * 0.62), up2 = 0.22 * Math.sin((u + du) * Math.PI * 0.9) - 0.95 * (u + du) * (u + du);
    let tx = out2 - out, ty = up2 - up; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2, side = Math.cos(a) * w, thick = Math.sin(a) * th;
      pos.push(side, up + thick * tx, out - thick * ty);
      const c = Math.sin(a) < 0 ? inC : outC;
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < sides; j++) {
    const a = i * (sides + 1) + j, b = a + sides + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* ---------- the character ---------- */
const SPINE = new CatmullRomCurve3([
  new Vector3(0, -0.12, 0), new Vector3(0, 0.4, 0.03), new Vector3(0.02, 0.95, 0.04),
  new Vector3(0.07, 1.4, 0), new Vector3(0.16, 1.74, -0.08)
]);
const R = 0.42, PEEL_LINE = 0.42;
const bodyRadius = (t) => {
  const bottom = Math.sqrt(Math.sin(clamp(t / 0.1) * Math.PI / 2));
  const top = t > 0.88 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.88) / 0.12, 2))) : 1;
  return R * bottom * (1 - 0.4 * smooth(clamp((t - 0.5) / 0.5))) * top;
};
const fabric = (color, extra) => new MeshPhysicalMaterial({ color, roughness: 0.85, sheen: 1, sheenRoughness: 0.5, sheenColor: new Color(0xffffff), ...extra });

function buildMascot(trunkColour) {
  const root = new Group();
  // peel round the bottom, flesh above it (slightly slimmer, as if the peel has come away)
  root.add(new Mesh(sweep(SPINE, (t) => bodyRadius(t) * 1.04, 0, PEEL_LINE + 0.02), new MeshPhysicalMaterial({ map: peelTex(), roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.5 })));
  root.add(new Mesh(sweep(SPINE, (t) => bodyRadius(t) * 0.97, PEEL_LINE - 0.04, 1, { ridge: 0.035 }), new MeshPhysicalMaterial({ map: fleshTex(), roughness: 0.62, sheen: 0.4, sheenRoughness: 0.4, sheenColor: new Color(0xfff6dd) })));

  // peel flaps, hinged where the peel stops so they can bounce
  const flaps = [], flapGeo = flapGeometry();
  const flapMat = new MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.15 });
  [0.6, 2.2, 3.7, 5.1].forEach((a, i) => {
    const P = SPINE.getPointAt(PEEL_LINE), r = bodyRadius(PEEL_LINE) * 1.02;
    const hinge = new Group();
    hinge.position.set(P.x + Math.sin(a) * r, P.y, P.z + Math.cos(a) * r);
    hinge.rotation.y = a;
    const f = new Mesh(flapGeo, flapMat);
    f.scale.setScalar(i % 2 ? 0.92 : 1.04);
    hinge.add(f); root.add(hinge); flaps.push(hinge);
  });

  // face: glossy eyes with catchlights, happy closed eyes for some moves, a smile, a little blush
  const face = new Group();
  const fp = SPINE.getPointAt(0.72), fr = bodyRadius(0.72) * 0.97;
  face.position.set(fp.x, fp.y, fp.z + fr);
  root.add(face);
  const gloss = new MeshPhysicalMaterial({ color: 0x0d0d0d, roughness: 0.08, clearcoat: 1 });
  const white = new MeshBasicMaterial({ color: 0xffffff });
  const eyes = [-1, 1].map((s) => {
    const g = new Group(); g.position.set(s * 0.11, 0.07, -0.01);
    const open = new Mesh(new SphereGeometry(0.05, 20, 16), gloss); open.scale.set(0.72, 1.2, 0.5);
    const glint = new Mesh(new SphereGeometry(0.013, 10, 8), white); glint.position.set(0.014, 0.024, 0.024); open.add(glint);
    const arc = new Mesh(new TorusGeometry(0.05, 0.013, 10, 20, Math.PI), gloss);
    g.add(open, arc); face.add(g);
    return { g, open, arc };
  });
  const smile = new Mesh(new TorusGeometry(0.075, 0.016, 10, 24, Math.PI), gloss); smile.rotation.z = Math.PI; smile.position.set(0, -0.035, 0.02);
  face.add(smile);
  const blush = new MeshBasicMaterial({ color: 0xff7aa8, transparent: true, opacity: 0.35 });
  [-1, 1].forEach((s) => { const b = new Mesh(new CircleGeometry(0.045, 20), blush); b.position.set(s * 0.2, -0.02, -0.025); b.rotation.y = s * 0.45; face.add(b); });

  // JUMPER trunks round the bottom
  const trunkMat = fabric(trunkColour);
  const trunk = new Mesh(new CylinderGeometry(0.465, 0.47, 0.34, 48, 1, true), trunkMat);
  trunk.material.side = DoubleSide; trunk.position.set(0, 0.05, 0.004); root.add(trunk);
  const seat = new Mesh(new SphereGeometry(0.47, 48, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), trunkMat);
  seat.scale.set(1, 0.42, 1); seat.position.set(0, -0.12, 0.004); root.add(seat);
  const band = new Mesh(new CylinderGeometry(0.48, 0.48, 0.1, 48, 1, true), new MeshPhysicalMaterial({ map: bandTex(), roughness: 0.7, sheen: 0.5, side: DoubleSide }));
  band.position.set(0, 0.25, 0.004); root.add(band);

  // limbs are rebuilt every frame (rubber hose); gloves and shoes ride on their ends
  const armMat = new MeshPhysicalMaterial({ map: peelTex(), roughness: 0.5, clearcoat: 0.15 }), legMat = fabric(0x1c1c1c);
  const arms = [-1, 1].map((s) => ({ s, mesh: new Mesh(new BufferGeometry(), armMat), glove: glove() }));
  arms.forEach((a) => root.add(a.mesh, a.glove.g));
  const legs = [-1, 1].map((s) => ({ s, mesh: new Mesh(new BufferGeometry(), legMat), shoe: shoe() }));
  legs.forEach((l) => root.add(l.mesh, l.shoe));
  return { root, flaps, eyes, arms, legs, trunkMat };
}
function glove() {
  const g = new Group(), mat = fabric(0xf6f6f2);
  const palm = new Mesh(new SphereGeometry(0.11, 24, 16), mat); palm.scale.set(1, 0.92, 0.78); g.add(palm);
  const cuff = new Mesh(new TorusGeometry(0.075, 0.035, 12, 24), mat); cuff.rotation.x = Math.PI / 2; cuff.position.y = 0.1; g.add(cuff);
  const fingers = [-0.06, 0, 0.06].map((x, i) => {
    const f = new Mesh(new CapsuleGeometry(0.04, 0.07, 8, 12), mat);
    f.position.set(x, -0.13, 0); f.rotation.z = (i - 1) * -0.25; g.add(f); return f;
  });
  const thumb = new Mesh(new CapsuleGeometry(0.038, 0.06, 8, 12), mat); thumb.position.set(0.1, -0.03, 0.02); thumb.rotation.z = 0.9; g.add(thumb);
  return { g, fingers, thumb, palm };
}
function shoe() {
  const g = new Group();
  const top = new Mesh(new SphereGeometry(0.15, 24, 16), new MeshPhysicalMaterial({ color: 0x141414, roughness: 0.35, clearcoat: 0.6 }));
  top.scale.set(0.95, 0.7, 1.45); top.position.set(0, 0.03, 0.08); g.add(top);
  const sole = new Mesh(new CylinderGeometry(0.14, 0.14, 0.05, 28), new MeshPhysicalMaterial({ color: 0xceff05, roughness: 0.6 }));
  sole.scale.set(1, 1, 1.55); sole.position.set(0, -0.06, 0.08); g.add(sole);
  return g;
}

/* ---------- moves ---------- */
// arm: raise 0 hangs down, PI/2 points out, PI points up; swing turns it forward (-) or back (+); bend pushes
// the elbow out; hand is open, fist, thumb or peace. leg: swing forward (-) or back (+), spread, lift.
const base = () => ({
  y: 0, rz: 0, squash: 0,
  armL: { raise: 0.35, swing: 0, bend: 0.15, hand: 'open' }, armR: { raise: 0.35, swing: 0, bend: 0.15, hand: 'open' },
  legL: { swing: 0, spread: 0.06, lift: 0 }, legR: { swing: 0, spread: 0.06, lift: 0 }, eyes: 'open', wiggle: 0
});
const MOVES = {
  wave(t) {
    const m = base();
    m.armR = { raise: 2.55 + Math.sin(t * 9) * 0.32, swing: -0.15, bend: 0.25, hand: 'open' };
    m.armL.swing = Math.sin(t * 1.6) * 0.1; m.y = Math.abs(Math.sin(t * 3)) * 0.03; m.rz = Math.sin(t * 3) * 0.03;
    return m;
  },
  thumbs(t) {
    const m = base(), b = Math.abs(Math.sin(t * 4));
    m.armR = { raise: 1.15 + b * 0.1, swing: -0.95, bend: -0.35, hand: 'thumb' };
    m.armL = { raise: 1.05, swing: 0.1, bend: 0.5, hand: 'fist' };
    m.y = b * 0.04; m.rz = -0.06; m.eyes = 'happy';
    return m;
  },
  stroll(t) {
    const m = base(), p = t * 6.5;
    m.legL = { swing: Math.sin(p) * 0.55, spread: 0.05, lift: Math.max(0, Math.cos(p)) * 0.12 };
    m.legR = { swing: -Math.sin(p) * 0.55, spread: 0.05, lift: Math.max(0, -Math.cos(p)) * 0.12 };
    m.armL = { raise: 0.45, swing: -Math.sin(p) * 0.6, bend: 0.3, hand: 'fist' };
    m.armR = { raise: 0.45, swing: Math.sin(p) * 0.6, bend: 0.3, hand: 'fist' };
    m.y = Math.abs(Math.sin(p)) * 0.07; m.rz = Math.sin(p) * 0.05; m.eyes = 'happy';
    return m;
  },
  wiggle(t) {
    // hands on hips, and every couple of seconds the hips go
    const m = base(), burst = Math.pow(Math.max(0, Math.sin(t * 2.1)), 4);
    m.armL = { raise: 0.9, swing: 0.2, bend: -0.9, hand: 'fist' }; m.armR = { raise: 0.9, swing: 0.2, bend: -0.9, hand: 'fist' };
    m.wiggle = burst * Math.sin(t * 22) * 0.16; m.legL.spread = 0.14; m.legR.spread = 0.14;
    return m;
  },
  wink(t) {
    const m = base(), b = Math.sin(t * 3);
    m.armR = { raise: 2.25, swing: -0.55, bend: -0.45, hand: 'peace' };
    m.armL = { raise: 0.5, swing: 0.15, bend: 0.2, hand: 'open' };
    m.eyes = 'wink'; m.rz = 0.1 + b * 0.03; m.y = Math.abs(b) * 0.03;
    return m;
  },
  jump(t) {
    const m = base(), u = (t % 1.25) / 1.25;
    const air = clamp((u - 0.2) / 0.55), up = Math.sin(Math.PI * air) * (u > 0.2 && u < 0.75 ? 1 : 0);
    const crouch = u < 0.2 ? Math.sin(Math.PI * u / 0.2) : u > 0.75 ? Math.sin(Math.PI * (u - 0.75) / 0.25) : 0;
    m.y = up * 0.6 - crouch * 0.08; m.squash = crouch * 0.14 - up * 0.06;
    m.armL = { raise: lerp(0.7, 2.75, up), swing: -0.2, bend: 0.4, hand: 'fist' }; m.armR = { raise: lerp(0.7, 2.75, up), swing: -0.2, bend: 0.4, hand: 'fist' };
    m.legL = { swing: -0.45 * up, spread: 0.12, lift: 0.18 * up }; m.legR = { swing: 0.2 * up, spread: 0.12, lift: 0.1 * up };
    m.eyes = up > 0.3 ? 'happy' : 'open';
    return m;
  }
};
const mix = (a, b, k) => {
  const out = {};
  for (const key in a) {
    const x = a[key], y = b[key];
    if (typeof x === 'number') out[key] = lerp(x, y, k);
    else if (typeof x === 'object') out[key] = mix(x, y, k);
    else out[key] = k < 0.5 ? x : y;
  }
  return out;
};

/* ---------- posing the rig ---------- */
const SHOULDER_T = 0.52, ARM = 0.62, LEG = 0.5;
const down = new Vector3(0, -1, 0), up = new Vector3(0, 1, 0), qTmp = new Quaternion();
function setGeo(mesh, geo) { mesh.geometry.dispose(); mesh.geometry = geo; }
function armPoints(s, a) {
  const P = SPINE.getPointAt(SHOULDER_T), r = bodyRadius(SHOULDER_T) * 0.9;
  const S = new Vector3(P.x + s * r, P.y, P.z);
  const dir = new Vector3(0, -1, 0).applyAxisAngle(new Vector3(0, 0, 1), s * a.raise).applyAxisAngle(new Vector3(1, 0, 0), a.swing);
  const H = S.clone().addScaledVector(dir, ARM);
  const out = new Vector3(s, 0, 0).cross(dir).cross(dir).multiplyScalar(-1).normalize();
  const E = S.clone().add(H).multiplyScalar(0.5).addScaledVector(out, a.bend * 0.22);
  return { S: S.clone().addScaledVector(new Vector3(s, 0, 0), -0.08), E, H, dir: H.clone().sub(E).normalize() };
}
function legPoints(s, l) {
  const hip = new Vector3(s * (0.17 + l.spread * 0.5), -0.1, 0);
  const dir = new Vector3(0, -1, 0).applyAxisAngle(new Vector3(1, 0, 0), l.swing).applyAxisAngle(new Vector3(0, 0, 1), s * l.spread);
  const F = hip.clone().addScaledVector(dir, LEG); F.y += l.lift;
  const K = hip.clone().add(F).multiplyScalar(0.5).add(new Vector3(0, 0, 0.06 + l.lift * 0.6));
  return { hip: hip.clone().add(new Vector3(0, 0.12, 0)), K, F };
}
function poseRig(ch, m, look) {
  ch.arms.forEach((a) => {
    const arm = a.s < 0 ? m.armL : m.armR, p = armPoints(a.s, arm);
    setGeo(a.mesh, new TubeGeometry(new CatmullRomCurve3([p.S, p.E, p.H]), 20, 0.05, 10, false));
    a.glove.g.position.copy(p.H);
    a.glove.g.quaternion.setFromUnitVectors(down, p.dir);
    a.glove.fingers.forEach((f, i) => { f.visible = !(arm.hand === 'fist' || arm.hand === 'thumb' || (arm.hand === 'peace' && i === 0)); });
    a.glove.palm.scale.set(1, arm.hand === 'open' ? 0.92 : 1.05, 0.85);
    if (arm.hand === 'thumb') {
      // the thumb points at the sky whatever the arm is doing
      a.glove.thumb.quaternion.copy(qTmp.copy(a.glove.g.quaternion).invert()).multiply(new Quaternion().setFromUnitVectors(up, up));
      a.glove.thumb.position.set(0, 0.04, 0.05); a.glove.thumb.scale.setScalar(1.25);
    } else {
      a.glove.thumb.rotation.set(0, 0, 0.9 * -a.s); a.glove.thumb.position.set(a.s * -0.1, -0.03, 0.02); a.glove.thumb.scale.setScalar(1);
    }
  });
  ch.legs.forEach((l) => {
    const leg = l.s < 0 ? m.legL : m.legR, p = legPoints(l.s, leg);
    setGeo(l.mesh, new TubeGeometry(new CatmullRomCurve3([p.hip, p.K, p.F]), 16, 0.07, 10, false));
    l.shoe.position.copy(p.F).add(new Vector3(0, -0.05, 0));
    l.shoe.rotation.set(Math.max(-0.6, leg.swing * 0.6), l.s * 0.12, 0);
  });
  ch.eyes.forEach((eye, i) => {
    const arc = m.eyes === 'happy' || (m.eyes === 'wink' && i === 1);
    eye.open.visible = !arc; eye.arc.visible = arc;
    eye.g.position.x = (i ? 1 : -1) * 0.11 + look.x * 0.02;
    eye.g.position.y = 0.07 + look.y * 0.015;
  });
}

/* ---------- stage ---------- */
function fallback(root) { root.classList.add('is-fallback'); }

function init(root) {
  if (live.has(root)) return;
  const canvas = root.querySelector('[data-about-canvas]');
  const reduce = document.documentElement.classList.contains('motion-reduced') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas) return fallback(root);
  let renderer;
  try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { return fallback(root); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.3, 6.6);
  const key = new DirectionalLight(0xfff4e0, 1.7); key.position.set(3, 4, 5); scene.add(key);
  const rimLime = new DirectionalLight(0xceff05, 1.1); rimLime.position.set(-5, 1.5, -3); scene.add(rimLime);
  const rimPink = new DirectionalLight(0xff2e9b, 0.7); rimPink.position.set(5, -1, -3); scene.add(rimPink);

  const firstDot = root.querySelector('[data-trunk-colour]');
  const colour = new Color(firstDot ? firstDot.dataset.trunkColour : '#5a2230'), target = colour.clone();
  const ch = buildMascot(colour.getHex());
  const pivot = new Group(), jelly = new Group();
  ch.root.position.y = -0.55;
  jelly.add(ch.root); pivot.add(jelly); scene.add(pivot);

  // "pose:side" per chapter; the mascot stands on the other side from the copy
  const poses = (root.dataset.poses || 'hero').split(',').map((p) => {
    const [name, side] = p.trim().split(':');
    const pose = { ...(POSES[name] || POSES.front) };
    if (side) pose.x = Math.abs(pose.x) * (side === 'right' ? -1 : 1);
    return pose;
  });
  const chapters = [...root.querySelectorAll('[data-ax-chapter]')];
  const blend = () => {
    const r = root.getBoundingClientRect(), range = r.height - window.innerHeight;
    const f = (range > 0 ? clamp(-r.top / range) : 0) * (poses.length - 1);
    if (poses.length < 2) return { pose: poses[0], active: 0 };
    const i = Math.min(poses.length - 2, Math.floor(f)), t = smooth(clamp((f - i - 0.15) / 0.7)), a = poses[i], b = poses[i + 1], pose = {};
    KEYS.forEach((k) => { pose[k] = lerp(a[k] || 0, b[k] || 0, t); });
    return { pose, active: Math.round(f) };
  };

  // drag to spin (with inertia), tap to squash, the cursor gets looked at
  let spin = 0, spinVel = 0, dragging = false, downX = 0, downY = 0, lastX = 0, moved = 0, snapAt = -10;
  const look = { x: 0, y: 0 }, lookTo = { x: 0, y: 0 };
  const onDown = (e) => { dragging = true; moved = 0; downX = lastX = e.clientX; downY = e.clientY; if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    lookTo.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth - 0.5) * 2));
    lookTo.y = Math.max(-1, Math.min(1, -(e.clientY / window.innerHeight - 0.4) * 2));
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    moved = Math.max(moved, Math.hypot(e.clientX - downX, e.clientY - downY));
    spin += dx * 0.012; spinVel = dx * 0.012;
  };
  const onUp = (e) => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) { snapAt = performance.now() / 1000; root.dispatchEvent(new CustomEvent('jumper:snap', { bubbles: true, detail: { x: e.clientX, y: e.clientY } })); }
  };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // dots and chapters recolour the trunks
  const dots = [...root.querySelectorAll('[data-trunk-colour]')];
  const pick = (hex) => {
    if (!hex) return;
    target.set(hex);
    dots.forEach((d) => d.setAttribute('aria-pressed', d.dataset.trunkColour.toLowerCase() === hex.toLowerCase() ? 'true' : 'false'));
  };
  dots.forEach((d) => d.addEventListener('click', () => { pick(d.dataset.trunkColour); snapAt = performance.now() / 1000; }));

  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(size); ro.observe(canvas); size();
  let visible = true;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }); io.observe(root);

  const now = { x: 0, y: 0, ry: 0, rx: 0, s: 1, spin: 0 };
  const born = performance.now();
  let raf = 0, lastChapter = -1, move = 'wave', prev = 'wave', changedAt = -10, flapVel = 0, flapAng = 0, lastY = 0;
  root.classList.add('is-3d');
  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    const t = reduce ? 0.4 : performance.now() / 1000, { pose, active } = blend();
    if (active !== lastChapter) {
      lastChapter = active;
      const c = chapters[active - 1];
      if (c && c.dataset.colour) pick(c.dataset.colour);
      const next = (poses[active] && poses[active].move) || 'wave';
      if (next !== move) { prev = move; move = next; changedAt = t; }
    }

    // up to 860px wide the copy stacks above the mascot (same breakpoint as the CSS)
    const narrow = window.innerWidth <= 860;
    const fit = narrow ? Math.min(1, camera.aspect / 0.62) * 0.78 : Math.max(0.72, Math.min(1, camera.aspect / 1.7));
    const ease = reduce ? 1 : 0.075;
    KEYS.forEach((k) => {
      let v = pose[k] || 0;
      if (narrow && k === 'x') v = 0;
      if (narrow && k === 'y') v = v * 0.4 - 0.5;
      if (k === 's') v *= fit;
      if (!narrow && k === 'x') v *= Math.min(1.25, camera.aspect / 1.4);
      now[k] += (v - now[k]) * ease;
    });

    const k = smooth(clamp((t - changedAt) / 0.45));
    const m = k < 1 ? mix(MOVES[prev](t), MOVES[move](t), k) : MOVES[move](t);
    look.x += (lookTo.x - look.x) * 0.08; look.y += (lookTo.y - look.y) * 0.08;
    poseRig(ch, m, look);

    // peel flaps lag behind the bounce, like they are on springs
    const vy = m.y - lastY; lastY = m.y;
    flapVel += -flapAng * 0.18 - vy * 1.6 - flapVel * 0.12 - m.wiggle * 0.02;
    flapAng += flapVel;
    ch.flaps.forEach((f, i) => { f.rotation.x = flapAng * (i % 2 ? 1.2 : 0.9) + Math.sin(t * 2 + i) * 0.03; });

    const intro = reduce ? 1 : pop(clamp((performance.now() - born) / 900));
    if (!dragging) { spin += spinVel; spinVel *= 0.94; spin *= 0.985; }
    const st = t - snapAt, boop = st < 1.2 && !reduce ? Math.exp(-st * 5) * Math.sin(st * 26) * 0.2 : 0;
    pivot.position.set(now.x, now.y + m.y, 0);
    pivot.rotation.set(now.rx - look.y * 0.08, now.ry + spin + look.x * 0.25 + now.spin * t * 0.7, m.rz);
    pivot.scale.setScalar(now.s * intro);
    jelly.scale.set(1 + (m.squash + boop) * 0.5, 1 - m.squash - boop, 1 + (m.squash + boop) * 0.5);
    jelly.rotation.z = m.wiggle + boop * 0.3;
    jelly.position.x = m.wiggle * 0.35;

    colour.lerp(target, 0.1);
    ch.trunkMat.color.copy(colour);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  live.set(root, () => {
    cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
    renderer.dispose(); pmrem.dispose(); live.delete(root);
  });
}

const boot = (scope) => (scope || document).querySelectorAll('[data-about-stage]').forEach(init);
boot();
document.addEventListener('shopify:section:load', (e) => boot(e.target));
document.addEventListener('shopify:section:unload', (e) => {
  e.target.querySelectorAll('[data-about-stage]').forEach((r) => { const d = live.get(r); if (d) d(); });
});
