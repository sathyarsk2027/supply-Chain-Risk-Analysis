import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, useTexture, Html } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

// ── Texture Cache & Procedural Generation ─────────────────────────────
const textureCache = new Map();

const createContainerTexture = (color, brandName, serialNumber, faceType) => {
  const key = `${color}-${brandName}-${serialNumber}-${faceType}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  // 2048 x 1024 provides 2:1 aspect ratio matching 3.0 x 1.3 face geometry with sharp resolution
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base metallic paint
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (faceType === 'side') {
    // Stamped corrugation (deep shadows and sharp highlights)
    for (let i = 0; i < canvas.width; i += 48) {
      // Shadow valley
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(i, 0, 24, canvas.height);
      // Highlight ridge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(i + 24, 0, 6, canvas.height);
    }

    // Heavy weathering (top and bottom rust/grime gradient)
    const rustGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    rustGrad.addColorStop(0, 'rgba(45, 28, 18, 0.65)');
    rustGrad.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
    rustGrad.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
    rustGrad.addColorStop(1, 'rgba(30, 20, 12, 0.85)');
    ctx.fillStyle = rustGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Weathered vertical rain streaks
    for (let i = 0; i < 60; i++) {
      const x = (i * 34.7 + 19) % canvas.width;
      const w = ((i * 7) % 4) + 1.5;
      const h = ((i * 19) % 350) + 150;
      const streakGrad = ctx.createLinearGradient(0, 0, 0, h);
      streakGrad.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
      streakGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = streakGrad;
      ctx.fillRect(x, 0, w, h);
    }

    // Structural perimeter frame
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, 40);
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillRect(0, 0, 25, canvas.height);
    ctx.fillRect(canvas.width - 25, 0, 25, canvas.height);

    // Massive Brand Logo: Dynamic auto-scaling to prevent text clipping
    const maxTextWidth = canvas.width * 0.58; // Confined strictly to 58% center to guarantee padding
    let fontSize = 130;
    ctx.font = `900 ${fontSize}px "Oswald", "Impact", "Arial Black", sans-serif`;
    let measuredWidth = ctx.measureText(brandName).width;
    while (measuredWidth > maxTextWidth && fontSize > 40) {
      fontSize -= 4;
      ctx.font = `900 ${fontSize}px "Oswald", "Impact", "Arial Black", sans-serif`;
      measuredWidth = ctx.measureText(brandName).width;
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(brandName, canvas.width / 2, canvas.height / 2);

    // Industrial Serial Decal (Top Right)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(serialNumber, canvas.width - 60, 90);

    // Weight/Capacity specs placard (Bottom Right)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(canvas.width - 260, canvas.height - 230, 200, 160);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MAX GW', canvas.width - 245, canvas.height - 185);
    ctx.fillText('30.480 KG', canvas.width - 245, canvas.height - 155);
    ctx.fillText('TARE WT', canvas.width - 245, canvas.height - 125);
    ctx.fillText(' 2.180 KG', canvas.width - 245, canvas.height - 95);

  } else if (faceType === 'door') {
    // Door panel division
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(canvas.width / 2 - 6, 40, 12, canvas.height - 80);

    // Vertical corrugation on doors
    for (let i = 40; i < canvas.width - 40; i += 48) {
      if (i > canvas.width / 2 - 20 && i < canvas.width / 2 + 20) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(i, 40, 18, canvas.height - 80);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(i + 18, 40, 6, canvas.height - 80);
    }

    // Heavy vertical locking bars (4 steel bars)
    ctx.fillStyle = 'rgba(35, 35, 35, 0.92)';
    ctx.fillRect(canvas.width * 0.22, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.38, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.62, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.78, 0, 20, canvas.height);

    // Cam lock handles
    ctx.fillStyle = 'rgba(160, 160, 160, 0.85)';
    ctx.fillRect(canvas.width * 0.22 - 12, canvas.height * 0.55, 44, 14);
    ctx.fillRect(canvas.width * 0.38 - 12, canvas.height * 0.55, 44, 14);
    ctx.fillRect(canvas.width * 0.62 - 12, canvas.height * 0.55, 44, 14);
    ctx.fillRect(canvas.width * 0.78 - 12, canvas.height * 0.55, 44, 14);

    // Door serial label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(serialNumber, canvas.width - 50, 75);

  } else if (faceType === 'top') {
    // Metal roof ribs & grime
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let i = 0; i < canvas.width; i += 60) {
      ctx.fillRect(i, 0, 3, canvas.height);
      ctx.fillRect(0, i, canvas.width, 3);
    }
    const edgeGrad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 150,
      canvas.width / 2, canvas.height / 2, canvas.width / 1.3
    );
    edgeGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edgeGrad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
};

// ── Single Container Mesh ─────────────────────────────────────────────
const ContainerMesh = ({ position, color, brand, serial, specialFaceIndex, specialTex, onClick, isInteractive }) => {
  const [hovered, setHovered] = useState(false);
  const sideTex = useMemo(() => createContainerTexture(color, brand, serial, 'side'), [color, brand, serial]);
  const topTex = useMemo(() => createContainerTexture(color, brand, serial, 'top'), [color, brand, serial]);
  const doorTex = useMemo(() => createContainerTexture(color, brand, serial, 'door'), [color, brand, serial]);

  return (
    <mesh
      position={position}
      castShadow
      receiveShadow
      onClick={onClick}
      onPointerOver={isInteractive ? (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; } : undefined}
      onPointerOut={isInteractive ? () => { setHovered(false); document.body.style.cursor = 'auto'; } : undefined}
    >
      <boxGeometry args={[3.0, 1.3, 1.2]} />
      {/* +X right side (Doors) */}
      {specialFaceIndex === 0 ? <meshBasicMaterial attach="material-0" map={specialTex} /> : <meshStandardMaterial attach="material-0" map={doorTex} roughness={0.4} metalness={0.7} />}
      {/* -X left side (Closed end) */}
      {specialFaceIndex === 1 ? <meshBasicMaterial attach="material-1" map={specialTex} /> : <meshStandardMaterial attach="material-1" map={doorTex} roughness={0.4} metalness={0.7} />}
      {/* +Y top */}
      <meshStandardMaterial attach="material-2" map={topTex} roughness={0.5} metalness={0.5} />
      {/* -Y bottom */}
      <meshStandardMaterial attach="material-3" color={color} roughness={0.8} metalness={0.2} />
      {/* +Z front (Long side facing camera) */}
      {specialFaceIndex === 4 ? <meshBasicMaterial attach="material-4" map={specialTex} /> : <meshStandardMaterial attach="material-4" map={sideTex} roughness={0.4} metalness={0.7} />}
      {/* -Z back (Long side) */}
      {specialFaceIndex === 5 ? <meshBasicMaterial attach="material-5" map={specialTex} /> : <meshStandardMaterial attach="material-5" map={sideTex} roughness={0.4} metalness={0.7} />}
    </mesh>
  );
};

// ── Serial Generator ───────────────────────────────────────────────────
const generateSerial = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  const r = (set, len) => Array.from({ length: len }, () => set[Math.floor(Math.random() * set.length)]).join('');
  return `${r(chars, 4)}-${r(nums, 6)}`;
};

// ── Realistic Organic Palette ──────────────────────────────────────────
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

// Fictional brand names only (scaled dynamically with generous margins)
const BRANDS = [
  'VANGUARD LINE',
  'TITAN FREIGHT',
  'ORION MARINE',
  'NEXUS CARGO',
  'ATLAS LOGISTICS',
  'APEX SHIPPING',
  'PACIFIC HAVEN',
  'MERIDIAN SEA',
  'CORAL LINES',
];

// ── Build Symmetric 3x3x1 Wall Arrangement ────────────────────────────
const buildContainerWall = () => {
  const containers = [];
  const gapY = 1.34; // Uniform vertical spacing
  const gapZ = 1.24; // Uniform horizontal bay spacing
  let idx = 0;

  for (let row = 1; row >= -1; row--) {       // Top to Bottom (1, 0, -1)
    for (let col = -1; col <= 1; col++) {     // Back to Front (-1, 0, 1)
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

// ── Animated Container with Anchored 3D <Html> Label ──────────────────
const AnimatedContainer = ({ c, activeTab, onTabClick, texFeeds, texSearch, texNasa }) => {
  let specialFaceIndex = -1;
  let specialTex = null;
  let offsetX = 0;
  let offsetZ = 0;
  let isTarget = false;
  let labelData = null;

  // The 3 front-facing containers assigned to the interactive tabs
  if (c.id === 'c-1-1') {
    // Top Front: Tab A (ALL FEEDS)
    isTarget = true;
    labelData = { marker: 'A', title: 'ALL FEEDS', tab: 'feed' };
    if (activeTab === 'feed') {
      offsetX = 0.35;
      offsetZ = 0.95;
      specialFaceIndex = 4;
      specialTex = texFeeds;
    }
  } else if (c.id === 'c-0-1') {
    // Mid Front: Tab B (SEMANTIC AI SEARCH)
    isTarget = true;
    labelData = { marker: 'B', title: 'SEMANTIC AI SEARCH', tab: 'search' };
    if (activeTab === 'search') {
      offsetX = 0.35;
      offsetZ = 0.95;
      specialFaceIndex = 4;
      specialTex = texSearch;
    }
  } else if (c.id === 'c--1-1') {
    // Bot Front: Tab C (NASA SATELLITE)
    isTarget = true;
    labelData = { marker: 'C', title: 'NASA SATELLITE', tab: 'analytics' };
    if (activeTab === 'analytics') {
      offsetX = 0.35;
      offsetZ = 0.95;
      specialFaceIndex = 4;
      specialTex = texNasa;
    }
  }

  const targetPos = [c.pos[0] + offsetX, c.pos[1], c.pos[2] + offsetZ];

  const { position } = useSpring({
    position: targetPos,
    config: { mass: 1.5, tension: 80, friction: 22 }
  });

  const isActive = labelData && activeTab === labelData.tab;

  return (
    <animated.group position={position}>
      <ContainerMesh 
        position={[0, 0, 0]} 
        color={c.color} 
        brand={c.brand} 
        serial={c.serial} 
        specialFaceIndex={specialFaceIndex}
        specialTex={specialTex}
        isInteractive={isTarget}
        onClick={isTarget && onTabClick ? () => onTabClick(labelData.tab) : undefined}
      />

      {isTarget && labelData && (
        <Html
          position={[-1.52, 0.22, 0.61]}
          center={false}
          distanceFactor={11}
          zIndexRange={[100, 0]}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            className={`r3f-container-label ${isActive ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onTabClick) {
                onTabClick(labelData.tab);
              }
            }}
            title={`Select ${labelData.title}`}
          >
            <div className="r3f-label-pill">
              <span className="r3f-label-marker">{labelData.marker}</span>
              <span className="r3f-label-text">{labelData.title}</span>
            </div>
            <div className="r3f-leader-line">
              <div className="r3f-leader-dot" />
            </div>
          </div>
        </Html>
      )}
    </animated.group>
  );
};

// ── Animated Stack ────────────────────────────────────────────────────
const Stack = ({ activeTab, onTabClick }) => {
  const floatRef = useRef();
  const containers = useMemo(() => buildContainerWall(), []);

  // Load the AI-generated textures
  const [texFeeds, texSearch, texNasa] = useTexture([
    '/assets/panel_feeds.jpg',
    '/assets/panel_search.jpg',
    '/assets/panel_nasa.jpg'
  ]);

  // Subtle ambient float
  useFrame((state) => {
    if (floatRef.current) {
      floatRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.04;
    }
  });

  return (
    <group position={[0, 0.2, 0]} scale={0.72}>
      <group ref={floatRef}>
        {containers.map((c) => (
          <AnimatedContainer 
            key={c.id} 
            c={c} 
            activeTab={activeTab}
            onTabClick={onTabClick}
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
export default function Hero3DContainer({ activeTab, onTabClick }) {
  return (
    <Canvas
      camera={{ position: [8, 5, 8], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.65} />

      {/* Cinematic Key Light */}
      <directionalLight
        position={[-10, 15, 10]}
        intensity={3.2}
        castShadow
      />

      {/* Cool Sky Fill */}
      <pointLight position={[10, 8, -10]} intensity={1.8} color="#e0f2fe" />

      {/* Warm Ground Bounce */}
      <pointLight position={[0, -5, 5]} intensity={1.2} color="#fed7aa" />

      <Environment preset="city" />

      <Stack activeTab={activeTab} onTabClick={onTabClick} />

      <ContactShadows
        position={[0, -2.5, 0]}
        opacity={0.55}
        scale={20}
        blur={2.2}
        far={5}
      />

      {/* Fixed viewing angle with smooth interaction */}
      <OrbitControls
        target={[0, 0, 0]}
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
      />
    </Canvas>
  );
}
