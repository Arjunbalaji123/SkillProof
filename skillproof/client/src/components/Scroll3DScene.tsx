import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Scroll3DSceneProps {
  scrollProgress: number; // 0.0 to 1.0
}

export const Scroll3DScene: React.FC<Scroll3DSceneProps> = ({ scrollProgress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.035);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0x312e81, 1.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x6366f1, 4, 20);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x10b981, 3, 20);
    pointLight2.position.set(-5, -3, 3);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x8b5cf6, 3, 25);
    pointLight3.position.set(0, 4, -4);
    scene.add(pointLight3);

    // 3. Object Group: Main Verification Shield / Card
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Outer Shield Frame (Icosahedron)
    const shieldGeo = new THREE.IcosahedronGeometry(2.2, 1);
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x4f46e5,
      emissive: 0x1e1b4b,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    mainGroup.add(shieldMesh);

    // Inner Core Shield
    const coreGeo = new THREE.OctahedronGeometry(1.4, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x047857,
      roughness: 0.3,
      metalness: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    mainGroup.add(coreMesh);

    // Verification Ring
    const ringGeo = new THREE.TorusGeometry(3.2, 0.04, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    mainGroup.add(ringMesh);

    // 4. Object Group: Skill Nodes Constellation
    const skillNodesGroup = new THREE.Group();
    scene.add(skillNodesGroup);

    const nodeColors = [0x6366f1, 0x10b981, 0xa855f7, 0x3b82f6, 0xf59e0b, 0xec4899];
    const nodeCount = isMobile ? 6 : 12;
    const nodeMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const geo = new THREE.DodecahedronGeometry(0.45, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: nodeColors[i % nodeColors.length],
        roughness: 0.3,
        metalness: 0.7,
        wireframe: i % 2 === 0,
      });
      const node = new THREE.Mesh(geo, mat);

      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 4.5 + (i % 3) * 0.8;
      node.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius + (Math.sin(i) * 0.8),
        (i % 4) * 0.5 - 1
      );
      skillNodesGroup.add(node);
      nodeMeshes.push(node);
    }

    // 5. Object Group: Floating Background Particles
    const particleCount = isMobile ? 80 : 250;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 35;
      particlePositions[i + 1] = (Math.random() - 0.5) * 35;
      particlePositions[i + 2] = (Math.random() - 0.5) * 20 - 5;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: isMobile ? 0.08 : 0.12,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Perspective Grid Floor
    const grid = new THREE.GridHelper(50, 40, 0x6366f1, 0x1e293b);
    grid.position.y = -5;
    grid.rotation.x = 0.1;
    scene.add(grid);

    // 7. Mouse Parallax Interactivity
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      if (prefersReducedMotion) return;
      mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 8. Window Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 9. Animation Loop with Lerp Smooth Interpolation
    let animationFrameId: number;
    let currentScroll = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Lerp scroll progress for ultra-smooth 60fps response
      currentScroll += (scrollRef.current - currentScroll) * 0.08;
      const progress = currentScroll;

      // Mouse Parallax Lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      if (!prefersReducedMotion) {
        // Continuous subtle rotation
        shieldMesh.rotation.y += 0.005;
        coreMesh.rotation.x += 0.008;
        ringMesh.rotation.z += 0.003;
        particles.rotation.y += 0.0004;

        nodeMeshes.forEach((n, idx) => {
          n.rotation.x += 0.01 * (idx % 2 === 0 ? 1 : -1);
          n.rotation.y += 0.01;
        });
      }

      // SCROLL-DRIVEN 3D SCENE TRANSFORMATION STATES:
      // SECTION 1: HERO (0.0 -> 0.25)
      if (progress <= 0.25) {
        const p1 = progress / 0.25;
        mainGroup.position.set(2.2 + mouse.x * 0.5, 0.2 + mouse.y * 0.3, 0);
        mainGroup.scale.setScalar(1 + p1 * 0.2);
        mainGroup.rotation.y = mouse.x * 0.4 + p1 * Math.PI * 0.3;

        skillNodesGroup.position.set(0, 0, -3);
        skillNodesGroup.scale.setScalar(0.8);
        grid.position.z = -5 + p1 * 2;
      }
      // SECTION 2: SKILLS CONSTELLATION (0.25 -> 0.50)
      else if (progress <= 0.50) {
        const p2 = (progress - 0.25) / 0.25;
        mainGroup.position.set(2.2 - p2 * 4.4 + mouse.x * 0.5, 0.2 + mouse.y * 0.3, -2);
        mainGroup.scale.setScalar(1.2 - p2 * 0.4);

        skillNodesGroup.position.set(mouse.x * 0.8, 0, p2 * 3);
        skillNodesGroup.scale.setScalar(0.8 + p2 * 0.6);
        skillNodesGroup.rotation.y = p2 * Math.PI * 0.5;
      }
      // SECTION 3: VERIFICATION ENGINE (0.50 -> 0.75)
      else if (progress <= 0.75) {
        const p3 = (progress - 0.50) / 0.25;
        mainGroup.position.set(0 + mouse.x * 0.4, 0.5 + mouse.y * 0.3, 1.5);
        mainGroup.scale.setScalar(1.4 + Math.sin(p3 * Math.PI) * 0.3);
        mainGroup.rotation.y = Math.PI * 0.6 + p3 * Math.PI * 0.4;

        ringMesh.scale.setScalar(1 + p3 * 0.4);
        skillNodesGroup.position.set(0, 0, -4);
        skillNodesGroup.scale.setScalar(0.6);
      }
      // SECTION 4 & 5: TRUST PASSPORT & FINAL CTA (0.75 -> 1.0)
      else {
        const p4 = (progress - 0.75) / 0.25;
        mainGroup.position.set(mouse.x * 0.6, -0.5 + mouse.y * 0.4, 1.0);
        mainGroup.scale.setScalar(1.1 - p4 * 0.2);
        mainGroup.rotation.y = Math.PI * 2 + mouse.x * 0.5;
        mainGroup.rotation.x = mouse.y * 0.3;

        skillNodesGroup.position.set(0, -2, -2);
        grid.position.z = 0;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose Geometries & Materials
      shieldGeo.dispose();
      shieldMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      grid.dispose();
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
