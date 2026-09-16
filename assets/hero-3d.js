/**
 * JUMPER // CYBERWEAR — HERO 3D & WEBGL ENGINE
 * Three.js 3D floating cyber garment, aurora lighting, and particle physics
 */

class Hero3DScene {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.garmentMesh = null;
    this.waistbandMesh = null;
    this.particles = null;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.clock = new THREE.Clock();
    this.scrollY = 0;
    this.scrollProgress = 0;

    this.init();
  }

  init() {
    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05060A, 0.04);

    // 2. Camera setup
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 8.5);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    this.setupLights();

    // 5. Create 3D Cyber Underwear & Waistband Geometry
    this.createCyberGarment();

    // 6. Create Quantum Dust Particle Field
    this.createParticleField();

    // 7. Event listeners
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('scroll', () => this.onScroll());

    // 8. Start render loop
    this.animate();
  }

  setupLights() {
    // Ambient Cyber Glow
    const ambientLight = new THREE.AmbientLight(0x101428, 2.5);
    this.scene.add(ambientLight);

    // Neon Lime Key Light
    this.limeLight = new THREE.PointLight(0xD6FF28, 4.5, 20);
    this.limeLight.position.set(4, 3, 4);
    this.scene.add(this.limeLight);

    // Electric Purple Fill Light
    this.purpleLight = new THREE.PointLight(0x9A5CFF, 5, 20);
    this.purpleLight.position.set(-4, -2, 3);
    this.scene.add(this.purpleLight);

    // Cyan Rim Light
    this.cyanLight = new THREE.DirectionalLight(0x3BE7FF, 3.5);
    this.cyanLight.position.set(0, 5, -3);
    this.scene.add(this.cyanLight);
  }

  createCyberGarment() {
    this.garmentGroup = new THREE.Group();

    // Custom Parametric Torso / Trunk Underwear Geometry
    // Using a morphed Cylinder & Torus composition with futuristic contour curves
    const trunkGeo = new THREE.CylinderGeometry(1.65, 1.45, 2.2, 48, 32, true);
    const pos = trunkGeo.attributes.position;
    
    // Deform vertices to sculpt anatomically athletic aerodynamic underwear shape
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Ergonomic waist taper & leg curve
      const angle = Math.atan2(z, x);
      const radiusFactor = 1 + 0.15 * Math.sin(angle * 2) - (y * 0.08);
      x *= radiusFactor;
      z *= radiusFactor * 0.85;

      // Leg cutouts at bottom
      if (y < -0.4) {
        const legIndent = Math.sin(x * 1.8) * 0.35;
        y += legIndent * 0.5;
      }

      pos.setXYZ(i, x, y, z);
    }
    trunkGeo.computeVertexNormals();

    // Custom Holographic Chrome / Micromodal Iridescent Shader Material
    this.garmentMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0E1325,
      emissive: 0x1A0B2E,
      emissiveIntensity: 0.2,
      roughness: 0.25,
      metalness: 0.75,
      clearcoat: 0.9,
      clearcoatRoughness: 0.15,
      reflectivity: 1.0,
      wireframe: false,
      side: THREE.DoubleSide
    });

    this.garmentMesh = new THREE.Mesh(trunkGeo, this.garmentMaterial);
    this.garmentGroup.add(this.garmentMesh);

    // Cyber Holographic Waistband with Glowing Jacquard Accent
    const waistGeo = new THREE.CylinderGeometry(1.68, 1.66, 0.38, 48, 1, true);
    const waistMat = new THREE.MeshStandardMaterial({
      color: 0x05060A,
      roughness: 0.4,
      metalness: 0.9,
      emissive: 0xD6FF28,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide
    });
    this.waistbandMesh = new THREE.Mesh(waistGeo, waistMat);
    this.waistbandMesh.position.y = 1.05;
    this.garmentGroup.add(this.waistbandMesh);

    // Glowing Neon Edge Piping
    const torusPipingGeo = new THREE.TorusGeometry(1.67, 0.035, 16, 64);
    const pipingMat = new THREE.MeshBasicMaterial({ color: 0xD6FF28 });
    const pipingMesh = new THREE.Mesh(torusPipingGeo, pipingMat);
    pipingMesh.rotation.x = Math.PI / 2;
    pipingMesh.position.y = 1.22;
    this.garmentGroup.add(pipingMesh);

    // Leg Cuff Pipings
    const leftCuff = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.025, 16, 48), new THREE.MeshBasicMaterial({ color: 0x3BE7FF }));
    leftCuff.rotation.x = Math.PI / 2.2;
    leftCuff.rotation.y = 0.2;
    leftCuff.position.set(0.75, -1.0, 0);
    this.garmentGroup.add(leftCuff);

    const rightCuff = leftCuff.clone();
    rightCuff.rotation.y = -0.2;
    rightCuff.position.x = -0.75;
    this.garmentGroup.add(rightCuff);

    this.scene.add(this.garmentGroup);
  }

  createParticleField() {
    const particleCount = 450;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const colorLime = new THREE.Color(0xD6FF28);
    const colorPurple = new THREE.Color(0x9A5CFF);
    const colorCyan = new THREE.Color(0x3BE7FF);

    for (let i = 0; i < particleCount; i++) {
      // Swirling cylinder distribution around product
      const radius = 2.0 + Math.random() * 5.0;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 8.0;

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      // Random vibrant palette
      const rand = Math.random();
      const c = rand < 0.4 ? colorLime : (rand < 0.75 ? colorPurple : colorCyan);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = Math.random() * 4 + 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const pMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, pMaterial);
    this.scene.add(this.particles);
  }

  onMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    this.mouse.targetX = x * 0.8;
    this.mouse.targetY = y * 0.5;
  }

  onScroll() {
    this.scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = window.innerHeight;
    this.scrollProgress = Math.min(this.scrollY / maxScroll, 1.5);
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setGarmentColor(colorHex, emissiveHex, name) {
    if (!this.garmentMaterial) return;
    gsap.to(this.garmentMaterial.color, {
      r: new THREE.Color(colorHex).r,
      g: new THREE.Color(colorHex).g,
      b: new THREE.Color(colorHex).b,
      duration: 0.8
    });
    if (this.waistbandMesh) {
      gsap.to(this.waistbandMesh.material.emissive, {
        r: new THREE.Color(emissiveHex).r,
        g: new THREE.Color(emissiveHex).g,
        b: new THREE.Color(emissiveHex).b,
        duration: 0.8
      });
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const elapsedTime = this.clock.getElapsedTime();

    // Smooth Mouse Orbit Lerp
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    if (this.garmentGroup) {
      // Idle Levitation + Mouse Tilt
      this.garmentGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.15 - (this.scrollProgress * 4.0);
      this.garmentGroup.rotation.y = elapsedTime * 0.35 + this.mouse.x * 1.2;
      this.garmentGroup.rotation.x = Math.sin(elapsedTime * 0.8) * 0.08 - this.mouse.y * 0.8;
      this.garmentGroup.rotation.z = Math.cos(elapsedTime * 0.7) * 0.05 + this.mouse.x * 0.2;

      // Scroll Explode / Morph Scaling
      const scale = 1.0 + this.scrollProgress * 1.2;
      this.garmentGroup.scale.set(scale, scale, scale);

      // Fabric Soft Ripple Deformation simulation
      if (this.garmentMesh) {
        const pos = this.garmentMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          const wave = Math.sin(u * 3 + elapsedTime * 2.5) * 0.012;
          pos.setZ(i, pos.getZ(i) + wave * 0.1);
        }
        this.garmentMesh.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Dynamic Swirling Particles
    if (this.particles) {
      this.particles.rotation.y = elapsedTime * 0.12;
      this.particles.rotation.x = Math.sin(elapsedTime * 0.1) * 0.1;
      
      if (this.scrollProgress > 0) {
        this.particles.scale.set(1 + this.scrollProgress * 3, 1 + this.scrollProgress * 3, 1 + this.scrollProgress * 3);
      }
    }

    // Dynamic Point Light Orbit
    if (this.limeLight) {
      this.limeLight.position.x = Math.sin(elapsedTime * 1.2) * 5;
      this.limeLight.position.z = Math.cos(elapsedTime * 1.2) * 5;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.Hero3DScene = Hero3DScene;
