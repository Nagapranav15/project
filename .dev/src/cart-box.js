// Checkout packing: the Jumper box in 3D, dressed as the Taped Mailer from the packaging directions (soft touch
// black, tone-on-tone gloss tapes, two Lime tapes crossing the lid, plain board inside, trunks sitting on tissue).
// The artwork comes from the printed net (assets/mailer-*.webp), lit and shadowed like a studio shot.
// When someone taps Checkout the packing screen opens: every piece in the bag drops into the box as a folded trunk
// (in its colour, with the woven JUMPER band), the lid comes down with a thud, and the root fires 'jumper:packed'
// so the theme can carry on to checkout. Loaded on that tap and only draws while the packing screen is open.
// Built to assets/cart-box.js with `npm run build:box`.
import {
  BoxGeometry, CanvasTexture, Color, TextureLoader, DirectionalLight, DoubleSide, Group, Mesh, MeshStandardMaterial,
  MeshPhysicalMaterial, NeutralToneMapping, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator,
  RepeatWrapping, Scene, ShadowMaterial, SRGBColorSpace, Vector3, WebGLRenderer
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const W = 3.3, D = 2.475, H = 0.96, T = 0.07, FLOOR = 0.05;     // box: width, depth, wall height, wall thickness (240 × 180 × 70 mm)
const LID_W = W + 0.12, LID_D = D + 0.12, SKIRT = 0.12;
const OPEN = -1.95;                                              // lid angle when open (radians, 0 is shut)
const REST_YAW = -0.2, TAU = Math.PI * 2;
const FONT = '600 {s}px Obv, Archivo, sans-serif';
const clamp = (t, a = 0, b = 1) => Math.max(a, Math.min(b, t));

/* ---------- textures ---------- */
function paint(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace; t.anisotropy = 4;
  const go = () => { x.clearRect(0, 0, w, h); draw(x, w, h); t.needsUpdate = true; };
  go();
  if (document.fonts && document.fonts.load) document.fonts.load('600 40px Obv').then(go, () => {});
  return t;
}
const font = (x, s) => { x.font = FONT.replace('{s}', s); };
// fine knit, used as a bump map so the fabric catches the light
const knit = (() => {
  let t = null;
  return () => t || (t = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 3) for (let i = 0; i < 128; i += 3) { const v = 128 + Math.sin(i * 0.9 + y) * 20 + (Math.random() - 0.5) * 26; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, y, 3, 2); }
    const tex = new CanvasTexture(c); tex.wrapS = tex.wrapT = RepeatWrapping; tex.repeat.set(4, 3); return tex;
  })());
})();
const bandTexture = () => paint(512, 80, (x, w, h) => {
  x.fillStyle = '#111111'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#CEFF05'; x.fillRect(0, 5, w, 3); x.fillRect(0, h - 8, w, 3);
  font(x, 44); x.textBaseline = 'alphabetic';
  const word = 'JUMPER', n = 3, step = w / n;
  for (let i = 0; i < n; i++) x.fillText(word, i * step + (step - x.measureText(word).width) / 2, 58);
});

/* ---------- the box ---------- */
// the printed net, one image per panel, already turned the way each face is seen
function netTextures(urls) {
  const loader = new TextureLoader(), out = {};
  ['lid', 'front', 'back', 'left', 'right'].forEach((k) => {
    if (!urls[k]) return;
    const t = loader.load(urls[k]); t.colorSpace = SRGBColorSpace; t.anisotropy = 8; out[k] = t;
  });
  return out;
}
function buildBox(urls) {
  const g = new Group(), tex = netTextures(urls);
  const board = new MeshStandardMaterial({ color: 0x161616, roughness: 0.92 });        // soft touch matte, no inside print
  const tissue = new MeshStandardMaterial({ color: 0xefefea, roughness: 1 });
  const print = (t) => (t ? new MeshStandardMaterial({ map: t, roughness: 0.78 }) : board);
  const wall = (w, h, d, x, y, z, mats) => {
    const m = new Mesh(new BoxGeometry(w, h, d), mats);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  wall(W, H, T, 0, H / 2, D / 2 - T / 2, [board, board, board, board, print(tex.front), board]);   // front
  wall(W, H, T, 0, H / 2, -D / 2 + T / 2, [board, board, board, board, board, print(tex.back)]);  // back
  wall(T, H, D - 2 * T, -W / 2 + T / 2, H / 2, 0, [board, print(tex.left), board, board, board, board]); // left
  wall(T, H, D - 2 * T, W / 2 - T / 2, H / 2, 0, [print(tex.right), board, board, board, board, board]); // right
  const floor = new Mesh(new BoxGeometry(W - 2 * T, FLOOR, D - 2 * T), [board, board, tissue, board, board, board]);
  floor.position.set(0, FLOOR / 2, 0); floor.receiveShadow = true; g.add(floor);

  // lid, hinged along the back edge: the printed lid on top, plain board underneath
  const hinge = new Group(); hinge.position.set(0, H + 0.02, -LID_D / 2);
  const top = new Mesh(new PlaneGeometry(LID_W, LID_D), print(tex.lid));
  top.rotation.x = -Math.PI / 2; top.position.set(0, 0, LID_D / 2); top.castShadow = true; top.receiveShadow = true; hinge.add(top);
  const under = new Mesh(new PlaneGeometry(LID_W, LID_D), board);
  under.rotation.x = Math.PI / 2; under.position.set(0, -0.004, LID_D / 2); under.receiveShadow = true; hinge.add(under);
  const skirtMat = new MeshStandardMaterial({ color: 0x161616, side: DoubleSide, roughness: 0.92 });
  const skirt = (w, x, z, ry) => { const s = new Mesh(new PlaneGeometry(w, SKIRT), skirtMat); s.position.set(x, -SKIRT / 2, z); s.rotation.y = ry; s.castShadow = true; hinge.add(s); };
  skirt(LID_W, 0, LID_D, 0); skirt(LID_W, 0, 0, 0);
  skirt(LID_D, -LID_W / 2, LID_D / 2, Math.PI / 2); skirt(LID_D, LID_W / 2, LID_D / 2, Math.PI / 2);
  g.add(hinge);
  return { g, hinge };
}

/* ---------- a folded trunk ---------- */
const slabGeo = new RoundedBoxGeometry(0.95, 0.15, 0.78, 3, 0.045);
const bandGeo = new PlaneGeometry(0.95, 0.17), creaseGeo = new PlaneGeometry(0.012, 0.5);
let bandMat = null, creaseMat = null;
function buildTrunk(hex) {
  if (!bandMat) {
    bandMat = new MeshStandardMaterial({ map: bandTexture(), roughness: 0.7 });
    creaseMat = new MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.28, roughness: 1 });
  }
  const g = new Group();
  const slab = new Mesh(slabGeo, new MeshPhysicalMaterial({ color: new Color(hex), roughness: 0.86, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new Color(0xffffff), bumpMap: knit(), bumpScale: 0.5 }));
  slab.castShadow = true; slab.receiveShadow = true; g.add(slab);
  const band = new Mesh(bandGeo, bandMat); band.rotation.x = -Math.PI / 2; band.position.set(0, 0.0765, -0.3); g.add(band);
  const crease = new Mesh(creaseGeo, creaseMat); crease.rotation.x = -Math.PI / 2; crease.position.set(0, 0.0765, 0.1); g.add(crease);
  return g;
}
function slotPos(i) {
  const level = Math.floor(i / 6), r = i % 6, row = Math.floor(r / 3), col = r % 3;
  return new Vector3((col - 1) * 1.02, FLOOR + 0.075 + level * 0.157, row === 0 ? -0.56 : 0.56);
}

/* ---------- stage ---------- */
function init(root) {
  if (root._box) return; root._box = true;
  const canvas = root.querySelector('[data-box-canvas]'), cap = root.querySelector('[data-box-cap]');
  const reduce = document.documentElement.classList.contains('motion-reduced') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const packed = () => root.dispatchEvent(new CustomEvent('jumper:packed'));
  if (!canvas) { packed(); return; }
  let renderer;
  try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: location.search.includes('boxdebug') }); } catch (e) { root.classList.add('is-fallback'); packed(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = NeutralToneMapping; renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene(), pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.55;
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  const key = new DirectionalLight(0xfff3df, 2.4); key.position.set(2.6, 6, 3.4); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 5; key.shadow.bias = -0.0006;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 16 });
  scene.add(key);
  const rim = new DirectionalLight(0xffffff, 0.7); rim.position.set(-4, 2, -3); scene.add(rim);

  const world = new Group(); scene.add(world);
  let urls = {}; try { urls = JSON.parse(root.dataset.net || '{}'); } catch (e) {}
  const box = buildBox(urls); world.add(box.g);
  const ground = new Mesh(new PlaneGeometry(14, 14), new ShadowMaterial({ opacity: 0.32 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.001; ground.receiveShadow = true; scene.add(ground);

  const trunks = new Map();                 // id -> { g, phase, vy, delay, target }
  let state = { total: 0, list: [] }, pending = 0, lastLand = -9, sent = false;
  let lid = { angle: OPEN, vel: 0 }, boxY = 0, boxVy = 0;
  let raf = 0, last = 0, clock = 0, camDist = 8;

  const isOpen = () => root.classList.contains('is-on');
  // the bag's line items (kept fresh in the drawer after every change); every piece becomes one folded trunk
  const readState = () => {
    const el = document.querySelector('[data-box-data]');
    try {
      const d = JSON.parse(el.textContent), list = [];
      d.items.forEach((it) => { for (let n = 0; n < it.qty && list.length < 18; n++) list.push({ id: it.key + '#' + n, hex: it.hex || '#777777' }); });
      return { total: list.length, list };
    } catch (e) { return { total: 0, list: [] }; }
  };
  const caption = (done) => {
    if (cap) cap.textContent = done ? root.dataset.done : root.dataset.packing;
    root.classList.toggle('is-packed', done);
  };

  // every time the packing screen opens: empty box, lid up, then the trunks drop in one after another
  function reset() {
    trunks.forEach((t) => world.remove(t.g)); trunks.clear();
    state = readState(); pending = 0; lastLand = -9; sent = false;
    lid.angle = OPEN; lid.vel = 0; boxY = 0; boxVy = 0;
    caption(false);
    if (!state.total) { packed(); return; }
    const gap = Math.min(0.24, 2.2 / state.total);
    state.list.forEach((x, i) => {
      const g = buildTrunk(x.hex), p = slotPos(i);
      const t = { id: x.id, g, phase: 'wait', vy: 0, delay: 0.45 + i * gap, target: p };
      g.position.set(p.x + (Math.random() - 0.5) * 0.5, 3.1 + i * 0.12, p.z + (Math.random() - 0.5) * 0.3);
      g.rotation.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.9);
      g.visible = false; world.add(g); trunks.set(x.id, t); pending++;
    });
  }

  function land() { pending = Math.max(0, pending - 1); lastLand = clock; boxVy -= 0.9; }
  function thud() {
    boxVy -= 1.4; caption(true);
    if (!sent) { sent = true; setTimeout(packed, 750); }
  }

  function frame(now) { raf = requestAnimationFrame(frame); step(now); }
  function step(now) {
    const dt = Math.max(0, Math.min(0.05, (now - (last || now)) / 1000)); last = now;
    const t = now / 1000; clock = t;

    // lid: stays up while trunks are still dropping, then comes down with a thud once the last one has settled
    const shut = state.total > 0 && pending === 0 && t - lastLand > 0.45;
    const target = shut ? 0 : OPEN, k = shut ? 70 : 38, c = shut ? 6.5 : 9;
    lid.vel += (-k * (lid.angle - target) - c * lid.vel) * dt; lid.angle += lid.vel * dt;
    if (lid.angle > 0) { if (lid.vel > 0.9) thud(); lid.angle = 0; lid.vel *= -0.22; }
    if (lid.angle < OPEN - 0.2) { lid.angle = OPEN - 0.2; lid.vel *= -0.2; }
    box.hinge.rotation.x = lid.angle; frameCamera();

    trunks.forEach((tr) => {
      const g = tr.g;
      if (tr.phase === 'wait') { tr.delay -= dt; if (tr.delay <= 0) { tr.phase = 'fall'; g.visible = true; tr.vy = -1; } return; }
      if (tr.phase === 'fall') {
        tr.vy -= 24 * dt; g.position.y += tr.vy * dt;
        g.position.x += (tr.target.x - g.position.x) * Math.min(1, 5 * dt); g.position.z += (tr.target.z - g.position.z) * Math.min(1, 5 * dt);
        ['x', 'y', 'z'].forEach((a) => { g.rotation[a] += (0 - g.rotation[a]) * Math.min(1, 7 * dt); });
        if (g.position.y <= tr.target.y && tr.vy < 0) {
          g.position.y = tr.target.y;
          if (!tr.landed) { tr.landed = true; land(); }
          tr.vy = -tr.vy * 0.3; if (Math.abs(tr.vy) < 0.7) tr.phase = 'rest';
        }
        return;
      }
      const e = Math.min(1, 9 * dt);
      g.position.x += (tr.target.x - g.position.x) * e; g.position.y += (tr.target.y - g.position.y) * e; g.position.z += (tr.target.z - g.position.z) * e;
      ['x', 'y', 'z'].forEach((a) => { g.rotation[a] += (0 - g.rotation[a]) * e; });
    });

    // box: a little hop on every landing, a slow showroom turn while it packs
    boxVy += (-90 * boxY - 9 * boxVy) * dt; boxY += boxVy * dt;
    box.g.position.y = boxY * 0.08; box.g.scale.set(1 + boxY * 0.05, 1 - boxY * 0.07, 1 + boxY * 0.05);
    world.rotation.y = REST_YAW + Math.sin(t * 0.6) * 0.12;
    renderer.render(scene, camera);
  }

  // the camera glides in once the lid is shut, so the closed box fills the frame
  const frameCamera = () => { const o = clamp(-lid.angle / 1.95), z = 0.8 + 0.32 * o; camera.position.set(0, camDist * 0.68 * z, camDist * 0.73 * z); camera.lookAt(0, 0.35 + 0.95 * o, 0.1); };
  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // keep the whole open box (lid up, ~4.2 units tall, ~4.6 wide) in frame on any shape of screen
    const half = Math.tan((camera.fov / 2) * Math.PI / 180);
    const dist = Math.max(5.3 / (2 * half), 5.5 / (2 * half * camera.aspect));
    camDist = dist; camera.updateProjectionMatrix(); frameCamera();
  };
  new ResizeObserver(size).observe(canvas); size();

  root._step = (ms) => { if (!last) last = ms - 16; for (let t = last + 16; t <= ms; t += 16) step(t); };
  root._debug = () => ({ trunks: [...trunks.values()].map((t) => [t.phase, +t.g.position.y.toFixed(2)]), total: state.total, pending, lid: +lid.angle.toFixed(2), raf: !!raf });
  const start = () => { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  let wasOpen = false;
  const onToggle = () => { const o = isOpen(); if (o && !wasOpen) { reset(); start(); } else if (!o && wasOpen) stop(); wasOpen = o; };
  new MutationObserver(onToggle).observe(root, { attributes: true, attributeFilter: ['class'] });
  onToggle();
}

const boot = () => document.querySelectorAll('[data-cart-box]').forEach(init);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
