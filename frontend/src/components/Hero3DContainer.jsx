import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, useTexture, Html } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

// ── Texture Cache & Procedural PBR Generators ─────────────────────────
const textureCache = new Map();

// Shared normal map vector generator (cached once per faceType)
const createCorrugationNormalMap = (faceType) => {
  const key = `normal-${faceType}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = faceType === 'side' ? 2048 : 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Tangent-space neutral base: normal pointing straight out (0, 0, 1) -> RGB(128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (faceType === 'side') {
    const pitch = 48;
    for (let x = 0; x < canvas.width; x += pitch) {
      // Left slope (tilting left: normal tilted toward -X) -> R ~ 58, G ~ 128, B ~ 235
      ctx.fillStyle = 'rgb(58, 128, 235)';
      ctx.fillRect(x, 0, 14, canvas.height);

      // Crest flat -> neutral normal
      ctx.fillStyle = 'rgb(128, 128, 255)';
      ctx.fillRect(x + 14, 0, 10, canvas.height);

      // Right slope (tilting right: normal tilted toward +X) -> R ~ 198, G ~ 128, B ~ 235
      ctx.fillStyle = 'rgb(198, 128, 235)';
      ctx.fillRect(x + 24, 0, 14, canvas.height);

      // Valley flat -> neutral normal
      ctx.fillStyle = 'rgb(128, 128, 255)';
      ctx.fillRect(x + 38, 0, 10, canvas.height);
    }

    // Outer frame perimeter bevels
    // Top frame rail bevel (tilts up: +Y) -> G ~ 198
    ctx.fillStyle = 'rgb(128, 198, 235)';
    ctx.fillRect(0, 0, canvas.width, 24);
    // Bottom frame rail bevel (tilts down: -Y) -> G ~ 58
    ctx.fillStyle = 'rgb(128, 58, 235)';
    ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
    // Left edge corner post bevel
    ctx.fillStyle = 'rgb(198, 128, 235)';
    ctx.fillRect(0, 0, 18, canvas.height);
    // Right edge corner post bevel
    ctx.fillStyle = 'rgb(58, 128, 235)';
    ctx.fillRect(canvas.width - 18, 0, 18, canvas.height);

  } else if (faceType === 'door') {
    const pitch = 48;
    for (let x = 40; x < canvas.width - 40; x += pitch) {
      if (x > canvas.width / 2 - 20 && x < canvas.width / 2 + 20) continue;
      ctx.fillStyle = 'rgb(75, 128, 240)';
      ctx.fillRect(x, 40, 14, canvas.height - 80);
      ctx.fillStyle = 'rgb(180, 128, 240)';
      ctx.fillRect(x + 18, 40, 14, canvas.height - 80);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.NoColorSpace; // linear data for normal maps
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
};

// Shared roughness map generator (cached once per faceType)
const createCorrugationRoughnessMap = (faceType) => {
  const key = `roughness-${faceType}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = faceType === 'side' ? 2048 : 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base satin paint roughness: ~0.38 (rgb 98, 98, 98)
  ctx.fillStyle = 'rgb(98, 98, 98)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (faceType === 'side') {
    // Corrugation valleys gather micro-dust -> higher roughness
    const pitch = 48;
    for (let x = 0; x < canvas.width; x += pitch) {
      ctx.fillStyle = 'rgb(168, 168, 168)';
      ctx.fillRect(x + 36, 0, 12, canvas.height);
    }

    // Heavy weathering & rust grime gradient at top and bottom (roughness ~0.85)
    const rustRough = ctx.createLinearGradient(0, 0, 0, canvas.height);
    rustRough.addColorStop(0, 'rgba(215, 215, 215, 0.92)');
    rustRough.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
    rustRough.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
    rustRough.addColorStop(1, 'rgba(225, 225, 225, 0.96)');
    ctx.fillStyle = rustRough;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Burnished steel highlights along structural edges -> lower roughness (higher specular glint)
    ctx.fillStyle = 'rgb(55, 55, 55)';
    ctx.fillRect(0, 36, canvas.width, 4);
    ctx.fillRect(0, canvas.height - 40, canvas.width, 4);

  } else if (faceType === 'door') {
    // Locking bars: smooth steel rods with low roughness
    ctx.fillStyle = 'rgb(65, 65, 65)';
    ctx.fillRect(canvas.width * 0.22, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.38, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.62, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.78, 0, 20, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.NoColorSpace; // linear data for roughness maps
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
};

// ── Diffuse / Livery Texture Generator ─────────────────────────────────
const createContainerTexture = (color, brandName, serialNumber, faceType) => {
  const key = `${color}-${brandName}-${serialNumber}-${faceType}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement('canvas');
  // 2048 x 1024 provides 2:1 aspect ratio matching 3.0 x 1.3 face geometry with sharp resolution
  canvas.width = faceType === 'side' ? 2048 : 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Base metallic paint
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (faceType === 'side') {
    // Subtle corrugation lighting accents
    for (let i = 0; i < canvas.width; i += 48) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(i, 0, 24, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
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

    // Edge wear and paint scuffs on corners and rails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, 38);
    ctx.fillRect(0, canvas.height - 38, canvas.width, 38);
    ctx.fillRect(0, 0, 24, canvas.height);
    ctx.fillRect(canvas.width - 24, 0, 24, canvas.height);

    // Bare steel micro-scuffs on frame edges
    ctx.fillStyle = 'rgba(200, 210, 205, 0.25)';
    ctx.fillRect(0, 36, canvas.width, 2);
    ctx.fillRect(0, canvas.height - 38, canvas.width, 2);

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
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
};

// ── Corner Castings Geometry Component (8 ISO Corner Blocks) ──────────
const CornerCastings = () => {
  const hw = 1.5;   // half width
  const hh = 0.65;  // half height
  const hd = 0.6;   // half depth
  const s = 0.11;   // cube size

  const positions = useMemo(() => [
    [-hw, -hh, -hd], [hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd],
    [-hw, -hh, hd],  [hw, -hh, hd],  [-hw, hh, hd],  [hw, hh, hd],
  ], []);

  return (
    <group>
      {positions.map((pos, idx) => (
        <mesh key={idx} position={pos} castShadow receiveShadow>
          <boxGeometry args={[s, s, s]} />
          <meshStandardMaterial color="#1b201d" roughness={0.65} metalness={0.82} />
        </mesh>
      ))}
    </group>
  );
};

// ── Vertical Door Locking Bars Component (+X Door End Face) ───────────
const DoorLockingHardware = () => {
  const rodZPositions = [-0.36, -0.12, 0.12, 0.36];

  return (
    <group position={[1.512, 0, 0]}>
      {/* 4 Vertical Locking Rods */}
      {rodZPositions.map((z, idx) => (
        <group key={idx} position={[0, 0, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.022, 1.22, 0.022]} />
            <meshStandardMaterial color="#2d3430" roughness={0.35} metalness={0.88} />
          </mesh>
          {/* Horizontal Cam Handle */}
          <mesh position={[0.015, -0.06, 0.02]} castShadow>
            <boxGeometry args={[0.038, 0.018, 0.06]} />
            <meshStandardMaterial color="#8a9690" roughness={0.3} metalness={0.92} />
          </mesh>
          {/* Top & Bottom Cam Keeper Brackets */}
          <mesh position={[0.01, 0.58, 0]}>
            <boxGeometry args={[0.03, 0.04, 0.035]} />
            <meshStandardMaterial color="#252b27" roughness={0.5} metalness={0.8} />
          </mesh>
          <mesh position={[0.01, -0.58, 0]}>
            <boxGeometry args={[0.03, 0.04, 0.035]} />
            <meshStandardMaterial color="#252b27" roughness={0.5} metalness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ── Frame Rails Component (Top and Bottom Perimeter Rails) ────────────
const FrameRails = () => {
  return (
    <group>
      {/* Top longitudinal rails */}
      <mesh position={[0, 0.65, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[3.01, 0.032, 0.032]} />
        <meshStandardMaterial color="#1e2421" roughness={0.5} metalness={0.75} />
      </mesh>
      <mesh position={[0, 0.65, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[3.01, 0.032, 0.032]} />
        <meshStandardMaterial color="#1e2421" roughness={0.5} metalness={0.75} />
      </mesh>
      {/* Bottom longitudinal runners */}
      <mesh position={[0, -0.65, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[3.01, 0.045, 0.045]} />
        <meshStandardMaterial color="#161b18" roughness={0.7} metalness={0.7} />
      </mesh>
      <mesh position={[0, -0.65, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[3.01, 0.045, 0.045]} />
        <meshStandardMaterial color="#161b18" roughness={0.7} metalness={0.7} />
      </mesh>
    </group>
  );
};

// ── Realistic Container Mesh with PBR Materials & Structural Detail ────
const ContainerMesh = ({ position, color, brand, serial, specialFaceIndex, specialTex, onClick, isInteractive }) => {
  const [hovered, setHovered] = useState(false);

  // Cached PBR Textures
  const sideTex = useMemo(() => createContainerTexture(color, brand, serial, 'side'), [color, brand, serial]);
  const topTex = useMemo(() => createContainerTexture(color, brand, serial, 'top'), [color, brand, serial]);
  const doorTex = useMemo(() => createContainerTexture(color, brand, serial, 'door'), [color, brand, serial]);

  const sideNormal = useMemo(() => createCorrugationNormalMap('side'), []);
  const sideRoughness = useMemo(() => createCorrugationRoughnessMap('side'), []);
  const doorNormal = useMemo(() => createCorrugationNormalMap('door'), []);
  const doorRoughness = useMemo(() => createCorrugationRoughnessMap('door'), []);

  return (
    <group position={position}>
      {/* Primary Container Body Mesh */}
      <mesh
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerOver={isInteractive ? (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; } : undefined}
        onPointerOut={isInteractive ? () => { setHovered(false); document.body.style.cursor = 'auto'; } : undefined}
      >
        <boxGeometry args={[3.0, 1.3, 1.2]} />
        {/* +X right side (Doors) */}
        {specialFaceIndex === 0 ? (
          <meshBasicMaterial attach="material-0" map={specialTex} />
        ) : (
          <meshStandardMaterial
            attach="material-0"
            map={doorTex}
            normalMap={doorNormal}
            normalScale={new THREE.Vector2(0.8, 0.8)}
            roughnessMap={doorRoughness}
            roughness={0.42}
            metalness={0.65}
          />
        )}
        {/* -X left side (Closed end) */}
        {specialFaceIndex === 1 ? (
          <meshBasicMaterial attach="material-1" map={specialTex} />
        ) : (
          <meshStandardMaterial
            attach="material-1"
            map={doorTex}
            normalMap={doorNormal}
            normalScale={new THREE.Vector2(0.8, 0.8)}
            roughnessMap={doorRoughness}
            roughness={0.42}
            metalness={0.65}
          />
        )}
        {/* +Y top */}
        <meshStandardMaterial attach="material-2" map={topTex} roughness={0.55} metalness={0.5} />
        {/* -Y bottom */}
        <meshStandardMaterial attach="material-3" color={color} roughness={0.8} metalness={0.2} />
        {/* +Z front (Long side facing camera) */}
        {specialFaceIndex === 4 ? (
          <meshBasicMaterial attach="material-4" map={specialTex} />
        ) : (
          <meshStandardMaterial
            attach="material-4"
            map={sideTex}
            normalMap={sideNormal}
            normalScale={new THREE.Vector2(0.85, 0.85)}
            roughnessMap={sideRoughness}
            roughness={0.45}
            metalness={0.65}
          />
        )}
        {/* -Z back (Long side) */}
        {specialFaceIndex === 5 ? (
          <meshBasicMaterial attach="material-5" map={specialTex} />
        ) : (
          <meshStandardMaterial
            attach="material-5"
            map={sideTex}
            normalMap={sideNormal}
            normalScale={new THREE.Vector2(0.85, 0.85)}
            roughnessMap={sideRoughness}
            roughness={0.45}
            metalness={0.65}
          />
        )}
      </mesh>

      {/* Structural Geometry Details */}
      <CornerCastings />
      <DoorLockingHardware />
      <FrameRails />
    </group>
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
      shadows
      camera={{ position: [8, 5, 8], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      {/* Balanced Ambient Light */}
      <ambientLight intensity={0.38} color="#e2e8f0" />

      {/* Directional Key Light with Soft Shadows */}
      <directionalLight
        position={[12, 16, 10]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={35}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0001}
      />

      {/* Cool Sky Secondary Fill */}
      <directionalLight position={[-10, 8, -10]} intensity={0.55} color="#94a3b8" />

      {/* Subtle Warm Olive Terminal Reflection */}
      <pointLight position={[0, -2, 4]} intensity={0.4} color="#8f9e7c" />

      {/* City Environment at Low Intensity (no background override) */}
      <Environment preset="city" background={false} environmentIntensity={0.4} />

      <Stack activeTab={activeTab} onTabClick={onTabClick} />

      {/* Soft Ground Shadow Receiver */}
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <shadowMaterial opacity={0.38} />
      </mesh>

      {/* Ground Contact Shadows (positioned directly beneath lowest container row at Y = -1.24) */}
      <ContactShadows
        position={[0, -1.24, 0]}
        opacity={0.72}
        scale={14}
        blur={1.8}
        far={3.2}
        resolution={1024}
        color="#040605"
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
