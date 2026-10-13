import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface SkillCore3DSceneProps {
  scrollProgress: number; // 0.0 to 1.0 master timeline
  cursorPos?: { x: number; y: number };
}

export const DigitalRun3DScene: React.FC<SkillCore3DSceneProps> = ({
  scrollProgress,
  cursorPos = { x: 0, y: 0 },
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  const cursorRef = useRef(cursorPos);
  cursorRef.current = cursorPos;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;

    // 1. WebGL Renderer & Light Professional Daylight Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f9fc);
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.012);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. High-End Studio Lighting (Daylight, Soft Shadows & Cyan/Royal Blue Highlights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.4);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xffffff, 2.5);
    mainSun.position.set(12, 24, 15);
    scene.add(mainSun);

    const blueLight = new THREE.PointLight(0x2563eb, 4.0, 30);
    blueLight.position.set(6, 6, 6);
    scene.add(blueLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 3.5, 30);
    cyanLight.position.set(-6, -4, 6);
    scene.add(cyanLight);

    const emeraldLight = new THREE.PointLight(0x16a34a, 0.0, 30); // turns on during verification
    emeraldLight.position.set(0, 0, 4);
    scene.add(emeraldLight);

    // 3. THE SKILL CORE — Central Sophisticated WebGL Crystalline Structure
    const skillCoreGroup = new THREE.Group();
    scene.add(skillCoreGroup);

    // Outer Translucent Crystalline Shell
    const shellGeo = new THREE.IcosahedronGeometry(2.0, 1);
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.85,
      opacity: 1,
      transparent: true,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      ior: 1.4,
    });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    skillCoreGroup.add(shellMesh);

    // Inner Layered Geometric Energy Core
    const innerCoreGeo = new THREE.OctahedronGeometry(1.2, 0);
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      wireframe: true,
    });
    const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    skillCoreGroup.add(innerCoreMesh);

    const coreNucleusGeo = new THREE.OctahedronGeometry(0.6, 0);
    const coreNucleusMat = new THREE.MeshBasicMaterial({ color: 0x0ea5a4, wireframe: false });
    const coreNucleusMesh = new THREE.Mesh(coreNucleusGeo, coreNucleusMat);
    skillCoreGroup.add(coreNucleusMesh);

    // 5 Orbiting Component Nodes (Skill, Project, Assessment, Cert, Achievement)
    const componentNodesGroup = new THREE.Group();
    skillCoreGroup.add(componentNodesGroup);

    const nodeColors = [0x2563eb, 0x06b6d4, 0x0ea5a4, 0x7c3aed, 0xf59e0b];
    const nodeMeshes: THREE.Mesh[] = [];

    nodeColors.forEach((color, idx) => {
      const nGeo = new THREE.OctahedronGeometry(0.35, 0);
      const nMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.2,
      });
      const nMesh = new THREE.Mesh(nGeo, nMat);
      componentNodesGroup.add(nMesh);
      nodeMeshes.push(nMesh);
    });

    // Verification Scan Beam & Ring
    const scanBeamGeo = new THREE.PlaneGeometry(5, 0.15);
    const scanBeamMat = new THREE.MeshBasicMaterial({
      color: 0x16a34a,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const scanBeamMesh = new THREE.Mesh(scanBeamGeo, scanBeamMat);
    scanBeamMesh.position.set(0, 2.5, 0);
    skillCoreGroup.add(scanBeamMesh);

    const verifRingGeo = new THREE.TorusGeometry(2.8, 0.08, 16, 80);
    const verifRingMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      emissive: 0x15803d,
      emissiveIntensity: 0.0,
      transparent: true,
      opacity: 0,
    });
    const verifRingMesh = new THREE.Mesh(verifRingGeo, verifRingMat);
    verifRingMesh.rotation.x = Math.PI / 2;
    skillCoreGroup.add(verifRingMesh);

    // Floating Skill Labels Anchors (React, Python, Java, SQL, Node.js, ML)
    const skillLabelsGroup = new THREE.Group();
    skillCoreGroup.add(skillLabelsGroup);

    const skillLabelPositions = [
      new THREE.Vector3(2.8, 1.2, 0.5),
      new THREE.Vector3(-2.8, 1.5, -0.5),
      new THREE.Vector3(2.5, -1.5, -0.8),
      new THREE.Vector3(-2.6, -1.2, 0.6),
      new THREE.Vector3(0, 2.6, 0.4),
      new THREE.Vector3(0, -2.6, -0.4),
    ];

    skillLabelPositions.forEach((pos, idx) => {
      const lGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const lMat = new THREE.MeshBasicMaterial({ color: idx % 2 === 0 ? 0x2563eb : 0x06b6d4 });
      const lMesh = new THREE.Mesh(lGeo, lMat);
      lMesh.position.copy(pos);
      skillLabelsGroup.add(lMesh);
    });

    // Subtle Particle Field
    const pCount = isMobile ? 30 : 90;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 16;
      pPos[i + 1] = (Math.random() - 0.5) * 16;
      pPos[i + 2] = (Math.random() - 0.5) * 10;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x2563eb, size: 0.1, transparent: true, opacity: 0.35 });
    const particleField = new THREE.Points(pGeo, pMat);
    scene.add(particleField);

    // 4. Animation Frame Loop & Master Scroll Timeline Interpolation
    let animationFrameId: number;
    let targetProgress = 0;
    let currentProgress = 0;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const secTime = time * 0.001;

      // Master Timeline Interpolation
      targetProgress = scrollRef.current;
      currentProgress += (targetProgress - currentProgress) * 0.08;

      const p = currentProgress; // 0.0 to 1.0

      // Magnetic Cursor Interpolation
      const mouseX = cursorRef.current.x;
      const mouseY = cursorRef.current.y;

      camera.position.x = mouseX * 0.5;
      camera.position.y = mouseY * 0.3;
      camera.lookAt(0, 0, 0);

      // --- PHASE 0 & 1: HERO & DISCOVER (0.0 to 0.25) ---
      if (p <= 0.25) {
        const localP = p / 0.25;
        // Core position transitions from right (x=1.8) on Hero to center (x=0)
        skillCoreGroup.position.x = THREE.MathUtils.lerp(1.8, 0, localP);
        skillCoreGroup.position.y = THREE.MathUtils.lerp(0.2, 0, localP);
        skillCoreGroup.scale.setScalar(1.0 + Math.sin(secTime * 2) * 0.03);

        // Orbiting nodes remain close
        nodeMeshes.forEach((n, idx) => {
          const angle = (idx / nodeMeshes.length) * Math.PI * 2 + secTime * 0.8;
          n.position.set(Math.cos(angle) * 1.6, Math.sin(angle) * 1.6, 0);
        });

        // Skill Labels reveal
        skillLabelsGroup.scale.setScalar(THREE.MathUtils.lerp(0.4, 1.2, localP));

        scanBeamMat.opacity = 0;
        verifRingMat.opacity = 0;
        emeraldLight.intensity = 0;
      }
      // --- PHASE 2: BUILD (0.25 to 0.45) ---
      else if (p <= 0.45) {
        const localP = (p - 0.25) / 0.2;

        skillCoreGroup.position.x = 0;
        skillCoreGroup.position.y = 0;

        // Core opens up & components orbit wider
        const orbitRadius = THREE.MathUtils.lerp(1.6, 3.4, localP);
        nodeMeshes.forEach((n, idx) => {
          const angle = (idx / nodeMeshes.length) * Math.PI * 2 + secTime * (1.2 + idx * 0.2);
          n.position.set(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, Math.sin(secTime + idx) * 0.8);
        });

        skillLabelsGroup.scale.setScalar(1.2 - localP * 0.5);
        scanBeamMat.opacity = 0;
        verifRingMat.opacity = 0;
      }
      // --- PHASE 3: ASSESS (0.45 to 0.60) ---
      else if (p <= 0.60) {
        const localP = (p - 0.45) / 0.15;

        // Components pull back together
        const orbitRadius = THREE.MathUtils.lerp(3.4, 1.8, localP);
        nodeMeshes.forEach((n, idx) => {
          const angle = (idx / nodeMeshes.length) * Math.PI * 2 + secTime * 0.6;
          n.position.set(Math.cos(angle) * orbitRadius, Math.sin(angle) * orbitRadius, 0);
        });

        scanBeamMat.opacity = 0;
        verifRingMat.opacity = 0;
      }
      // --- PHASE 4: VERIFY SIGNATURE CLIMAX (0.60 to 0.75) ---
      else if (p <= 0.75) {
        const localP = (p - 0.60) / 0.15;

        // Crystalline transparency & Laser Scanning Beam
        shellMat.transmission = THREE.MathUtils.lerp(0.85, 0.98, localP);
        scanBeamMat.opacity = Math.sin(localP * Math.PI) * 0.85;
        scanBeamMesh.position.y = THREE.MathUtils.lerp(2.2, -2.2, localP);

        // Verification Ring activation
        verifRingMat.opacity = localP;
        verifRingMat.emissiveIntensity = localP * 1.5;
        verifRingMesh.rotation.z = secTime * 1.5;

        // Emerald Verification Glow
        emeraldLight.intensity = localP * 5.0;
        innerCoreMat.color.setHex(localP > 0.5 ? 0x16a34a : 0x2563eb);
      }
      // --- PHASE 5 & 6: TRUST & RECRUITER (0.75 to 0.90) ---
      else if (p <= 0.90) {
        const localP = (p - 0.75) / 0.15;

        // Camera dolly out
        camera.position.z = THREE.MathUtils.lerp(9, 11, localP);

        // Compact Verified Artifact
        skillCoreGroup.scale.setScalar(THREE.MathUtils.lerp(1.0, 0.75, localP));
        verifRingMat.opacity = 0.8;
        emeraldLight.intensity = 3.0;
      }
      // --- PHASE 7: FINAL TRANSFORMATION (0.90 to 1.0) ---
      else {
        const localP = (p - 0.90) / 0.1;

        // Convergence into wordmark
        skillCoreGroup.scale.setScalar(THREE.MathUtils.lerp(0.75, 0.1, localP));
        skillCoreGroup.rotation.y += 0.05;
        scanBeamMat.opacity = 0;
        verifRingMat.opacity = THREE.MathUtils.lerp(0.8, 0, localP);
      }

      // Continuous Rotations
      if (!prefersReducedMotion) {
        skillCoreGroup.rotation.y = secTime * 0.4 + mouseX * 0.3;
        skillCoreGroup.rotation.x = secTime * 0.2 + mouseY * 0.2;
        innerCoreMesh.rotation.z = -secTime * 0.6;
        coreNucleusMesh.rotation.y = secTime * 0.8;
      }

      renderer.render(scene, camera);
    };

    animate(0);

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      shellGeo.dispose();
      shellMat.dispose();
      innerCoreGeo.dispose();
      innerCoreMat.dispose();
      coreNucleusGeo.dispose();
      coreNucleusMat.dispose();
      scanBeamGeo.dispose();
      scanBeamMat.dispose();
      verifRingGeo.dispose();
      verifRingMat.dispose();
      pGeo.dispose();
      pMat.dispose();

      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
};
