import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, useTexture } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

// ── Hyper-realistic procedural texture generator ───────────────────────
const textureCache = new Map();

const createContainerTexture = (color, brandName, serialNumber, faceType) => {
  const key = `${color}-${brandName}-${serialNumber}-${faceType}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base metallic paint
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (faceType === 'side') {
    // Stamped corrugation (deep shadows and sharp highlights)
    for (let i = 0; i < canvas.width; i += 36) {
      // Shadow valley
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(i, 0, 18, canvas.height);
      // Highlight ridge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(i + 18, 0, 4, canvas.height);
    }

    // Heavy weathering (top and bottom rust/grime)
    const rustGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    rustGrad.addColorStop(0, 'rgba(50, 30, 20, 0.6)');
    rustGrad.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
    rustGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
    rustGrad.addColorStop(1, 'rgba(30, 20, 10, 0.8)');
    ctx.fillStyle = rustGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Drip streaks (rain washing dirt down)
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const w = Math.random() * 4 + 1;
      const h = Math.random() * canvas.height * 0.5 + canvas.height * 0.2;
      const streakGrad = ctx.createLinearGradient(0, 0, 0, h);
      streakGrad.addColorStop(0, 'rgba(0,0,0,0.2)');
      streakGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = streakGrad;
      ctx.fillRect(x, 0, w, h);
    }

    // Heavy metal frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, 30);
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    ctx.fillRect(0, 0, 15, canvas.height);
    ctx.fillRect(canvas.width - 15, 0, 15, canvas.height);

    // Massive Brand Logo (simulating painted stencil)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '900 130px "Oswald", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(brandName, canvas.width / 2, canvas.height / 2);

    // Industrial Decals & Serial
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 32px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(serialNumber, canvas.width - 40, 70);

    // Weight/Capacity specs box (bottom right)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(canvas.width - 180, canvas.height - 200, 140, 150);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '20px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MAX GW', canvas.width - 170, canvas.height - 160);
    ctx.fillText('30.480 KG', canvas.width - 170, canvas.height - 130);
    ctx.fillText('TARE', canvas.width - 170, canvas.height - 100);
    ctx.fillText(' 2.200 KG', canvas.width - 170, canvas.height - 70);

  } else if (faceType === 'door') {
    // Door panels
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(canvas.width / 2 - 4, 30, 8, canvas.height - 60); // center gap
    
    // Vertical stamped ridges for doors
    for (let i = 30; i < canvas.width - 30; i += 40) {
      if (i > canvas.width/2 - 10 && i < canvas.width/2 + 10) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(i, 30, 15, canvas.height - 60);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(i + 15, 30, 5, canvas.height - 60);
    }

    // Heavy locking bars (4 vertical bars)
    ctx.fillStyle = 'rgba(40, 40, 40, 0.9)';
    ctx.fillRect(canvas.width * 0.25, 0, 15, canvas.height);
    ctx.fillRect(canvas.width * 0.4, 0, 15, canvas.height);
    ctx.fillRect(canvas.width * 0.6, 0, 15, canvas.height);
    ctx.fillRect(canvas.width * 0.75, 0, 15, canvas.height);

    // Locking handles
    ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
    ctx.fillRect(canvas.width * 0.25 - 10, canvas.height * 0.55, 35, 10);
    ctx.fillRect(canvas.width * 0.4 - 10, canvas.height * 0.55, 35, 10);
    ctx.fillRect(canvas.width * 0.6 - 10, canvas.height * 0.55, 35, 10);
    ctx.fillRect(canvas.width * 0.75 - 10, canvas.height * 0.55, 35, 10);

    // Decals
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(serialNumber, canvas.width - 30, 50);

  } else if (faceType === 'top') {
    // Dirty metal roof
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.fillRect(i, 0, 2, canvas.height);
      ctx.fillRect(0, i, canvas.width, 2);
    }
    const edgeGrad = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, 100,
      canvas.width/2, canvas.height/2, canvas.width/1.2
    );
    edgeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    edgeGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
};

// ── Single realistic container mesh ────────────────────────────────────
const ContainerMesh = ({ position, color, brand, serial, specialFaceIndex, specialTex }) => {
  const sideTex = useMemo(() => createContainerTexture(color, brand, serial, 'side'), [color, brand, serial]);
  const topTex = useMemo(() => createContainerTexture(color, brand, serial, 'top'), [color, brand, serial]);
  const doorTex = useMemo(() => createContainerTexture(color, brand, serial, 'door'), [color, brand, serial]);

  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={[3.0, 1.3, 1.2]} />
      {/* +X right side (Doors) -> specialFaceIndex 0 */}
      {specialFaceIndex === 0 ? <meshBasicMaterial attach="material-0" map={specialTex} /> : <meshStandardMaterial attach="material-0" map={doorTex} roughness={0.4} metalness={0.7} />}
      {/* -X left side (Closed end) -> specialFaceIndex 1 */}
      {specialFaceIndex === 1 ? <meshBasicMaterial attach="material-1" map={specialTex} /> : <meshStandardMaterial attach="material-1" map={doorTex} roughness={0.4} metalness={0.7} />}
      {/* +Y top */}
      <meshStandardMaterial attach="material-2" map={topTex} roughness={0.5} metalness={0.5} />
      {/* -Y bottom */}
      <meshStandardMaterial attach="material-3" color={color} roughness={0.8} metalness={0.2} />
      {/* +Z front (Long side) -> specialFaceIndex 4 */}
      {specialFaceIndex === 4 ? <meshBasicMaterial attach="material-4" map={specialTex} /> : <meshStandardMaterial attach="material-4" map={sideTex} roughness={0.4} metalness={0.7} />}
      {/* -Z back (Long side) -> specialFaceIndex 5 */}
      {specialFaceIndex === 5 ? <meshBasicMaterial attach="material-5" map={specialTex} /> : <meshStandardMaterial attach="material-5" map={sideTex} roughness={0.4} metalness={0.7} />}
    </mesh>
  );
};

// ── Serial generator ───────────────────────────────────────────────────
const generateSerial = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  const r = (set, len) => Array.from({ length: len }, () => set[Math.floor(Math.random() * set.length)]).join('');
  return `${r(chars, 4)}-${r(nums, 6)}`;
};

// ── Realistic organic palette ──────────────────────────────────────────
const CONTAINER_COLORS = [
  '#4a5e4a', // Dark Forest
  '#b0aca3', // Stone/Gray
  '#d4897a', // Faded Rust
  '#3a4f66', // Deep Blue
  '#a38c6d', // Sand/Gold
  '#8f9e7c', // Olive
  '#6b7b8a', // Steel Blue
  '#7a3f3a', // Dark Red
  '#c4b99a', // Cream
];

const BRANDS = ['NEXUS LOGISTICS', 'APEX CARGO', 'GLOBAL FREIGHT', 'VANGUARD LINE', 'ORION SHIPPING', 'ECHO LOGISTICS', 'TITAN MARINE', 'ATLAS FREIGHT', 'PACIFIC CARGO'];

// ── Build 3x3x1 wall arrangement ───────────────────────────────────────
const buildContainerWall = () => {
  const containers = [];
  const gapY = 1.32; // Height 1.3 + gap
  const gapZ = 1.22; // Depth 1.2 + gap
  let idx = 0;

  // X is length. They are all centered at X=0 so they sit side-by-side.
  for (let row = 1; row >= -1; row--) {       // 3 rows high (Top to Bottom)
    for (let col = -1; col <= 1; col++) {     // 3 wide on Z axis (Left to Right)
      const x = 0;
      const y = row * gapY;
      const z = col * gapZ;
      
      containers.push({
        id: `c-${row}-${col}`,
        color: CONTAINER_COLORS[idx % CONTAINER_COLORS.length],
        brand: BRANDS[idx % BRANDS.length],
        pos: [x, y, z],
        serial: generateSerial(),
      });
      idx++;
    }
  }
  return containers;
};

const AnimatedContainer = ({ c, isExploded, activeTab, texFeeds, texSearch, texNasa }) => {
  let specialFaceIndex = -1;
  let specialTex = null;
  let offsetX = 0;
  let offsetY = 0;
  let offsetZ = 0;

  if (c.id === 'c-1-1') { // Top Front Container (Label A)
    if (isExploded) {
      offsetX = -1.2; // Slide Left
      offsetY = 0.3;  // Slide Up slightly to avoid overlap
      offsetZ = 1.0;  // Slide Forward
      if (activeTab === 'feed') {
        specialFaceIndex = 4; // +Z face (Long side facing camera)
        specialTex = texFeeds;
      }
    }
  } else if (c.id === 'c-0-1') { // Mid Front Container (Label B)
    if (isExploded) {
      offsetX = -0.7; // Slide slightly Left
      offsetY = 0.0;
      offsetZ = 1.2;  // Slide Forward more
      if (activeTab === 'search') {
        specialFaceIndex = 4; 
        specialTex = texSearch;
      }
    }
  } else if (c.id === 'c--1-1') { // Bot Front Container (Label C)
    if (isExploded) {
      offsetX = -0.2; // Slide slightly Left
      offsetY = -0.4; // Slide Down slightly to prevent going up visually
      offsetZ = 1.0;  // Slide Forward
      if (activeTab === 'analytics') {
        specialFaceIndex = 4; 
        specialTex = texNasa;
      }
    }
  }

  const targetPos = [c.pos[0] + offsetX, c.pos[1] + offsetY, c.pos[2] + offsetZ];

  const { position } = useSpring({
    position: targetPos,
    config: { mass: 2, tension: 70, friction: 20 }
  });

  return (
    <animated.group position={position}>
      <ContainerMesh 
        position={[0, 0, 0]} 
        color={c.color} 
        brand={c.brand} 
        serial={c.serial} 
        specialFaceIndex={specialFaceIndex}
        specialTex={specialTex}
      />
    </animated.group>
  );
};

// ── Animated stack ─────────────────────────────────────────────────────
const Stack = ({ activeTab }) => {
  const floatRef = useRef();
  const containers = useMemo(() => buildContainerWall(), []);

  // Load the AI-generated holographic textures
  const [texFeeds, texSearch, texNasa] = useTexture([
    '/assets/panel_feeds.jpg',
    '/assets/panel_search.jpg',
    '/assets/panel_nasa.jpg'
  ]);

  const isExploded = activeTab !== 'overview';

  // Subtle idle float
  useFrame((state) => {
    if (floatRef.current) {
      floatRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.05;
    }
  });

  return (
    <group position={[0, 1.3, 0]} scale={0.75}>
      <group ref={floatRef}>
        {containers.map((c) => (
          <AnimatedContainer 
            key={c.id} 
            c={c} 
            activeTab={activeTab}
            isExploded={isExploded}
            texFeeds={texFeeds}
            texSearch={texSearch}
            texNasa={texNasa}
          />
        ))}
      </group>
    </group>
  );
};

// ── Main Export ────────────────────────────────────────────────────────
export default function Hero3DContainer({ activeTab }) {
  return (
    <Canvas
      camera={{ position: [8, 5, 8], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.6} />

      {/* Cinematic Key Light */}
      <directionalLight
        position={[-10, 15, 10]}
        intensity={3.5}
        castShadow
      />

      {/* Cool Sky Fill */}
      <pointLight position={[10, 8, -10]} intensity={2.0} color="#e0f2fe" />

      {/* Warm Ground Bounce */}
      <pointLight position={[0, -5, 5]} intensity={1.5} color="#fed7aa" />

      <Environment preset="city" />

      <Stack activeTab={activeTab} />

      <ContactShadows
        position={[0, -2.5, 0]}
        opacity={0.6}
        scale={20}
        blur={2}
        far={5}
      />

      {/* Lock to exactly view the 3x3 wall corner */}
      <OrbitControls
        target={[0, 0, 0]}
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </Canvas>
  );
}
