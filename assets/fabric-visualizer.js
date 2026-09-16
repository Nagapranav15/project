/**
 * JUMPER // CYBERWEAR — FABRIC 3D WEAVE VISUALIZER
 * Microscopic fiber weave simulation using Three.js Curves and Mesh standard materials
 */

class FabricVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0, 7);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.initLights();
    this.createMicroModalWeave();
    this.animate();
  }

  initLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambient);

    const light1 = new THREE.PointLight(0xD6FF28, 4, 15);
    light1.position.set(3, 3, 3);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0x3BE7FF, 3.5, 15);
    light2.position.set(-3, -3, 3);
    this.scene.add(light2);
  }

  createMicroModalWeave() {
    const threadCount = 10;
    const spacing = 0.5;

    const threadMat1 = new THREE.MeshPhysicalMaterial({
      color: 0x182038,
      roughness: 0.1,
      metalness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    const threadMat2 = new THREE.MeshPhysicalMaterial({
      color: 0xD6FF28,
      roughness: 0.2,
      metalness: 0.5,
      emissive: 0xD6FF28,
      emissiveIntensity: 0.15
    });

    // Warp Threads (Vertical)
    for (let x = -threadCount/2; x < threadCount/2; x++) {
      const points = [];
      for (let y = -4; y <= 4; y += 0.2) {
        const z = Math.sin(y * 4 + x) * 0.12;
        points.push(new THREE.Vector3(x * spacing, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.08, 8, false);
      const mesh = new THREE.Mesh(tubeGeo, x % 2 === 0 ? threadMat1 : threadMat2);
      this.group.add(mesh);
    }

    // Weft Threads (Horizontal)
    for (let y = -threadCount/2; y < threadCount/2; y++) {
      const points = [];
      for (let x = -4; x <= 4; x += 0.2) {
        const z = -Math.sin(x * 4 + y) * 0.12;
        points.push(new THREE.Vector3(x, y * spacing, z));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.08, 8, false);
      const mesh = new THREE.Mesh(tubeGeo, y % 2 === 0 ? threadMat2 : threadMat1);
      this.group.add(mesh);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const time = Date.now() * 0.001;
    this.group.rotation.x = Math.sin(time * 0.5) * 0.2 + 0.3;
    this.group.rotation.y = time * 0.3;
    this.renderer.render(this.scene, this.camera);
  }
}

window.FabricVisualizer = FabricVisualizer;
