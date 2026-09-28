import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, Html } from '@react-three/drei';
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
    ctx.fillStyle = 'rgb(128, 198, 235)';
    ctx.fillRect(0, 0, canvas.width, 24);
    ctx.fillStyle = 'rgb(128, 58, 235)';
    ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
    ctx.fillStyle = 'rgb(198, 128, 235)';
    ctx.fillRect(0, 0, 18, canvas.height);
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
  texture.colorSpace = THREE.NoColorSpace;
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

  // Base satin paint roughness: ~0.38
  ctx.fillStyle = 'rgb(98, 98, 98)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (faceType === 'side') {
    const pitch = 48;
    for (let x = 0; x < canvas.width; x += pitch) {
      ctx.fillStyle = 'rgb(168, 168, 168)';
      ctx.fillRect(x + 36, 0, 12, canvas.height);
    }

    // Heavy weathering & rust grime gradient at top and bottom
    const rustRough = ctx.createLinearGradient(0, 0, 0, canvas.height);
    rustRough.addColorStop(0, 'rgba(215, 215, 215, 0.92)');
    rustRough.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
    rustRough.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
    rustRough.addColorStop(1, 'rgba(225, 225, 225, 0.96)');
    ctx.fillStyle = rustRough;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Burnished steel highlights along structural edges
    ctx.fillStyle = 'rgb(55, 55, 55)';
    ctx.fillRect(0, 36, canvas.width, 4);
    ctx.fillRect(0, canvas.height - 40, canvas.width, 4);

  } else if (faceType === 'door') {
    ctx.fillStyle = 'rgb(65, 65, 65)';
    ctx.fillRect(canvas.width * 0.22, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.38, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.62, 0, 20, canvas.height);
    ctx.fillRect(canvas.width * 0.78, 0, 20, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
};

// Procedural Diffuse & Livery Generator
const createContainerTexture = (baseColor, brandName, serialNumber, faceType = 'side') => {
  const cacheKey = `${baseColor}-${brandName}-${serialNumber}-${faceType}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);

  const canvas = document.createElement('canvas');
  canvas.width = faceType === 'side' ? 2048 : 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // 1. Base Painted Steel
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Weathering Gradients (Grime & Salt Wash)
  const topShadow = ctx.createLinearGradient(0, 0, 0, 180);
  topShadow.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  topShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = topShadow;
  ctx.fillRect(0, 0, canvas.width, 180);

  const bottomGrime = ctx.createLinearGradient(0, canvas.height - 220, 0, canvas.height);
  bottomGrime.addColorStop(0, 'rgba(0, 0, 0, 0)');
  bottomGrime.addColorStop(1, 'rgba(20, 16, 10, 0.58)');
  ctx.fillStyle = bottomGrime;
  ctx.fillRect(0, canvas.height - 220, canvas.width, 220);

  // Edge rust wash along outer seams
  ctx.fillStyle = 'rgba(68, 38, 22, 0.28)';
  ctx.fillRect(0, 0, canvas.width, 12);
  ctx.fillRect(0, canvas.height - 14, canvas.width, 14);

  // 3. Corrugation & Details
  if (faceType === 'side') {
    const pitch = 48;
    for (let i = 0; i < canvas.width; i += pitch) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(i, 0, 14, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(i + 14, 0, 6, canvas.height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(i + 20, 0, 10, canvas.height);
    }

    // Outer structural frame borders
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, 28);
    ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
    ctx.fillRect(0, 0, 24, canvas.height);
    ctx.fillRect(canvas.width - 24, 0, 24, canvas.height);

    // Hazard Corner Notches
    const drawHazardPads = (x, y) => {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(x, y, 64, 40);
      ctx.fillStyle = '#0f172a';
      for (let s = 0; s < 64; s += 16) {
        ctx.beginPath();
        ctx.moveTo(x + s, y);
        ctx.lineTo(x + s + 8, y);
        ctx.lineTo(x + s, y + 40);
        ctx.lineTo(x + s - 8, y + 40);
        ctx.closePath();
        ctx.fill();
      }
    };
    drawHazardPads(30, 34);
    drawHazardPads(canvas.width - 94, 34);

    // Brand Name Livery (Centered with generous side margin)
    const availableWidth = canvas.width * 0.58;
    let fontSize = 175;
    ctx.font = `900 ${fontSize}px "Oswald", "Impact", "Arial Black", sans-serif`;
    let measuredWidth = ctx.measureText(brandName).width;

    while (measuredWidth > availableWidth && fontSize > 40) {
      fontSize -= 6;
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(canvas.width / 2 - 6, 40, 12, canvas.height - 80);

    for (let i = 40; i < canvas.width - 40; i += 48) {
      if (i > canvas.width / 2 - 20 && i < canvas.width / 2 + 20) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(i, 40, 18, canvas.height - 80);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(i + 18, 40, 6, canvas.height - 80);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(serialNumber, canvas.width - 50, 75);

  } else if (faceType === 'top') {
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
  textureCache.set(cacheKey, texture);
  return texture;
};

// ── Corner Castings Geometry Component (8 ISO Corner Blocks) ──────────
const CornerCastings = () => {
  const hw = 1.5;
  const hh = 0.65;
  const hd = 0.6;
  const s = 0.11;

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

// ── Vertical Door Locking Bars Component (Static for background containers) ─
const DoorLockingHardware = () => {
  const rodZPositions = [-0.36, -0.12, 0.12, 0.36];

  return (
    <group position={[1.512, 0, 0]}>
      {rodZPositions.map((z, idx) => (
        <group key={idx} position={[0, 0, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.022, 1.22, 0.022]} />
            <meshStandardMaterial color="#2d3430" roughness={0.35} metalness={0.88} />
          </mesh>
          <mesh position={[0.015, -0.06, 0.02]} castShadow>
            <boxGeometry args={[0.038, 0.018, 0.06]} />
            <meshStandardMaterial color="#8a9690" roughness={0.3} metalness={0.92} />
          </mesh>
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

// ── Animated Opening Doors Component (For Interactive Containers B & C) ─
const OpeningDoors = ({ doorOpenProgress, doorTex, doorNormal, doorRoughness, isHovered }) => {
  return (
    <group position={[1.502, 0, 0]}>
      {/* Left Door Wing (pivots outward around +Z edge at Z = +0.59) */}
      <animated.group
        position={[0, 0, 0.59]}
        rotation={doorOpenProgress.to((v) => [0, v * 1.95, 0])}
      >
        <group position={[-0.015, 0, -0.295]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.03, 1.24, 0.58]} />
            <meshStandardMaterial
              map={doorTex}
              normalMap={doorNormal}
              roughnessMap={doorRoughness}
              roughness={0.42}
              metalness={0.65}
              emissive={isHovered ? '#10b981' : '#000000'}
              emissiveIntensity={isHovered ? 0.18 : 0}
            />
          </mesh>
          {/* Vertical locking rods on left wing */}
          {[-0.12, 0.14].map((z, idx) => (
            <group key={idx} position={[0.02, 0, z]}>
              <mesh castShadow>
                <boxGeometry args={[0.02, 1.2, 0.02]} />
                <meshStandardMaterial color="#2d3430" roughness={0.35} metalness={0.88} />
              </mesh>
              <mesh position={[0.015, -0.06, 0.01]} castShadow>
                <boxGeometry args={[0.035, 0.018, 0.05]} />
                <meshStandardMaterial color="#8a9690" roughness={0.3} metalness={0.92} />
              </mesh>
            </group>
          ))}
        </group>
      </animated.group>

      {/* Right Door Wing (pivots outward around -Z edge at Z = -0.59) */}
      <animated.group
        position={[0, 0, -0.59]}
        rotation={doorOpenProgress.to((v) => [0, -v * 1.95, 0])}
      >
        <group position={[-0.015, 0, 0.295]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.03, 1.24, 0.58]} />
            <meshStandardMaterial
              map={doorTex}
              normalMap={doorNormal}
              roughnessMap={doorRoughness}
              roughness={0.42}
              metalness={0.65}
              emissive={isHovered ? '#10b981' : '#000000'}
              emissiveIntensity={isHovered ? 0.18 : 0}
            />
          </mesh>
          {/* Vertical locking rods on right wing */}
          {[-0.14, 0.12].map((z, idx) => (
            <group key={idx} position={[0.02, 0, z]}>
              <mesh castShadow>
                <boxGeometry args={[0.02, 1.2, 0.02]} />
                <meshStandardMaterial color="#2d3430" roughness={0.35} metalness={0.88} />
              </mesh>
              <mesh position={[0.015, -0.06, -0.01]} castShadow>
                <boxGeometry args={[0.035, 0.018, 0.05]} />
                <meshStandardMaterial color="#8a9690" roughness={0.3} metalness={0.92} />
              </mesh>
            </group>
          ))}
        </group>
      </animated.group>
    </group>
  );
};

// ── Interior Chamber Cavity (Dark steel interior liner) ───────────────
const InteriorChamber = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[2.92, 1.22, 1.14]} />
      <meshStandardMaterial
        color="#080c09"
        roughness={0.9}
        metalness={0.2}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

// ── Frame Rails Component (Top and Bottom Perimeter Rails) ────────────
const FrameRails = () => {
  return (
    <group>
      <mesh position={[0, 0.65, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[3.01, 0.032, 0.032]} />
        <meshStandardMaterial color="#1e2421" roughness={0.5} metalness={0.75} />
      </mesh>
      <mesh position={[0, 0.65, -0.6]} castShadow receiveShadow>
        <boxGeometry args={[3.01, 0.032, 0.032]} />
        <meshStandardMaterial color="#1e2421" roughness={0.5} metalness={0.75} />
      </mesh>
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

// ── Theme A: Live Headline Marquee / Ticker Generator ──────────────────
const FALLBACK_HEADLINES = [
  'RED SEA: Commercial liners re-route around Cape of Good Hope amid maritime disruption',
  'PANAMA CANAL: Daily vessel transit capacity adjusted as watershed levels recover',
  'PORT OF ROTTERDAM: Automated container dwell monitoring reports 18% throughput efficiency increase',
  'EAST CHINA SEA: Typhoon alert cautions container traffic across Shanghai-Ningbo corridors',
  'STRAIT OF MALACCA: Real-time AIS vessel density at 94% peak capacity',
  'GLOBAL FREIGHT INDEX: Spot rates stabilize across Trans-Pacific routes'
];

const useLiveTickerTexture = (articles) => {
  const [internalHeadlines, setInternalHeadlines] = useState(FALLBACK_HEADLINES);

  useEffect(() => {
    if (Array.isArray(articles) && articles.length > 0) {
      const list = articles.slice(0, 12).map((a) => {
        const cat = a.category ? `[${a.category.toUpperCase()}] ` : '';
        return `${cat}${a.title || 'Supply Chain Intelligence Update'}`;
      });
      setInternalHeadlines(list);
    } else {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      fetch(`${apiBase}/api/articles`)
        .then((res) => {
          if (!res.ok) throw new Error('API cold');
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const list = data.slice(0, 12).map((a) => {
              const cat = a.category ? `[${a.category.toUpperCase()}] ` : '';
              return `${cat}${a.title || 'Supply Chain Disruption Update'}`;
            });
            setInternalHeadlines(list);
          }
        })
        .catch(() => {
          // Graceful fallback to default offline headlines
        });
    }
  }, [articles]);

  const { canvas, ctx, texture } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 1024;
    const context = c.getContext('2d');
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, ctx: context, texture: tex };
  }, []);

  useEffect(() => {
    return () => {
      try {
        texture.dispose();
      } catch (e) {}
    };
  }, [texture]);

  const offsetRef = useRef(0);
  const tickerString = useMemo(() => {
    return '  ///  🔴 LIVE INTEL  ///  ' + internalHeadlines.join('   ■   ') + '   ///   ';
  }, [internalHeadlines]);

  useFrame((state, delta) => {
    if (!ctx) return;
    offsetRef.current += delta * 125;

    const w = canvas.width;
    const h = canvas.height;

    // Dark industrial container background
    ctx.fillStyle = '#1e2b20';
    ctx.fillRect(0, 0, w, h);

    // Corrugation shade lines
    for (let x = 0; x < w; x += 48) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(x, 0, 16, h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(x + 16, 0, 6, h);
    }

    // Top Brand Livery: ATLAS FREIGHT
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '900 80px "Oswald", "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATLAS FREIGHT', w / 2, 140);

    // Hazard Stripes above Ticker
    const stripeY = 240;
    const stripeH = 26;
    for (let s = 0; s < w; s += 40) {
      ctx.fillStyle = s % 80 === 0 ? '#eab308' : '#1e2420';
      ctx.beginPath();
      ctx.moveTo(s, stripeY);
      ctx.lineTo(s + 20, stripeY);
      ctx.lineTo(s + 10, stripeY + stripeH);
      ctx.lineTo(s - 10, stripeY + stripeH);
      ctx.closePath();
      ctx.fill();
    }

    // Digital LED Marquee Screen Area (Y: 280 to 760)
    ctx.fillStyle = '#060907';
    ctx.fillRect(40, 280, w - 80, 480);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 280, w - 80, 480);

    // LED scanline grid inside marquee
    ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
    for (let my = 290; my < 750; my += 14) {
      ctx.fillRect(45, my, w - 90, 2);
    }

    // Header inside marquee
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('● SYSTEM STATUS: ONLINE  |  GLOBAL SUPPLY CHAIN DISRUPTION TICKER', 70, 340);

    // Marquee scrolling text
    ctx.font = 'bold 62px "JetBrains Mono", "Courier New", monospace';
    const textWidth = ctx.measureText(tickerString).width || 1;
    const loopOffset = offsetRef.current % textWidth;

    ctx.save();
    ctx.beginPath();
    ctx.rect(50, 370, w - 100, 260);
    ctx.clip();

    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 12;
    ctx.textAlign = 'left';
    ctx.fillText(tickerString, 60 - loopOffset, 510);
    ctx.fillText(tickerString, 60 - loopOffset + textWidth, 510);
    ctx.restore();

    // Footer telemetry inside marquee
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '28px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('AIS MARITIME TELEMETRY FEED: ONLINE  [LIVE REUTERS / RSS / SATELLITE]', w - 70, 720);

    // Bottom container specs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '26px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CONTAINER ID: AF-9281-INTEL  |  MAX PAYLOAD: 28,480 KG', 80, 890);

    texture.needsUpdate = true;
  });

  return texture;
};

// ── Theme B: Interior Glowing Particle Trade Network ──────────────────
const TRADE_NODES = [
  { pos: [0.85, 0.15, 0.22], color: '#06b6d4', size: 0.052 },
  { pos: [0.72, -0.12, 0.28], color: '#10b981', size: 0.046 },
  { pos: [0.88, 0.32, -0.05], color: '#06b6d4', size: 0.042 },
  { pos: [0.92, -0.05, 0.12], color: '#06b6d4', size: 0.044 },
  { pos: [0.38, -0.08, 0.18], color: '#ef4444', size: 0.06 },
  { pos: [0.46, -0.18, 0.05], color: '#f59e0b', size: 0.048 },
  { pos: [0.28, -0.22, 0.24], color: '#ef4444', size: 0.054 },
  { pos: [-0.08, 0.22, 0.15], color: '#06b6d4', size: 0.05 },
  { pos: [-0.18, 0.14, 0.02], color: '#10b981', size: 0.044 },
  { pos: [0.02, 0.08, 0.26], color: '#06b6d4', size: 0.042 },
  { pos: [-0.65, 0.18, -0.18], color: '#06b6d4', size: 0.05 },
  { pos: [-0.78, 0.24, 0.12], color: '#10b981', size: 0.046 },
  { pos: [-0.48, -0.22, 0.08], color: '#f59e0b', size: 0.052 }
];

const ROUTE_CONNECTIONS = [
  [0, 1], [0, 2], [0, 3], [1, 5], [5, 4], [4, 6], [4, 7], [7, 8], [7, 9],
  [10, 12], [11, 12], [12, 7], [1, 10]
];

const InteriorNetworkNodeCluster = ({ isOpen }) => {
  const groupRef = useRef();
  const packetRef = useRef([]);

  const routeGeometry = useMemo(() => {
    const points = [];
    ROUTE_CONNECTIONS.forEach(([fromIdx, toIdx]) => {
      points.push(new THREE.Vector3(...TRADE_NODES[fromIdx].pos));
      points.push(new THREE.Vector3(...TRADE_NODES[toIdx].pos));
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useFrame((state) => {
    if (!isOpen) return;
    const t = state.clock.elapsedTime;
    ROUTE_CONNECTIONS.slice(0, 4).forEach(([fromIdx, toIdx], i) => {
      if (packetRef.current[i]) {
        const p1 = new THREE.Vector3(...TRADE_NODES[fromIdx].pos);
        const p2 = new THREE.Vector3(...TRADE_NODES[toIdx].pos);
        const prog = (t * 0.6 + i * 0.25) % 1.0;
        const current = p1.clone().lerp(p2, prog);
        packetRef.current[i].position.copy(current);
      }
    });
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <pointLight position={[0.6, 0, 0]} color="#06b6d4" intensity={isOpen ? 3.0 : 0} distance={3.8} />

      <lineSegments geometry={routeGeometry}>
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.65} linewidth={1} />
      </lineSegments>

      {TRADE_NODES.map((node, i) => (
        <mesh key={i} position={node.pos}>
          <sphereGeometry args={[node.size, 12, 12]} />
          <meshBasicMaterial color={node.color} />
        </mesh>
      ))}

      {[0, 1, 2, 3].map((idx) => (
        <mesh key={`pkt-${idx}`} ref={(el) => (packetRef.current[idx] = el)}>
          <sphereGeometry args={[0.024, 8, 8]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
      ))}
    </group>
  );
};

// ── Theme C: Interior Holographic Rotating NASA Risk Globe ────────────
const InteriorNasaRiskGlobe = ({ isOpen }) => {
  const globeGroupRef = useRef();
  const satRef = useRef();
  const radarRingRef = useRef();

  useFrame((state, delta) => {
    if (!isOpen) return;
    const t = state.clock.elapsedTime;
    if (globeGroupRef.current) {
      globeGroupRef.current.rotation.y += delta * 0.45;
    }
    if (satRef.current) {
      const orbit = t * 1.8;
      satRef.current.position.set(Math.cos(orbit) * 0.52, Math.sin(orbit) * 0.2, Math.sin(orbit) * 0.52);
    }
    if (radarRingRef.current) {
      const s = 0.5 + ((t * 0.8) % 1) * 1.2;
      radarRingRef.current.scale.set(s, s, s);
      radarRingRef.current.material.opacity = Math.max(0, 1 - (s - 0.5) / 1.2);
    }
  });

  return (
    <group position={[0.65, 0, 0]}>
      <pointLight color="#f59e0b" intensity={isOpen ? 3.2 : 0} distance={3.8} />

      <group ref={globeGroupRef} rotation={[0.38, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.34, 18, 18]} />
          <meshBasicMaterial color="#f59e0b" wireframe transparent opacity={0.5} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshBasicMaterial color="#b45309" transparent opacity={0.3} />
        </mesh>
        {[
          [0.26, 0.12, 0.18],  // Suez
          [0.31, -0.05, 0.12], // Bab el-Mandeb
          [0.15, -0.02, 0.3],  // Malacca
          [-0.24, 0.08, 0.22]  // Panama
        ].map((pt, i) => (
          <mesh key={i} position={pt}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        ))}
      </group>

      <mesh rotation={[Math.PI / 4, 0, 0.3]}>
        <torusGeometry args={[0.52, 0.008, 12, 48]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
      </mesh>

      <group ref={satRef}>
        <mesh>
          <boxGeometry args={[0.035, 0.025, 0.02]} />
          <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.008, 0.07, 0.025]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      </group>

      <mesh ref={radarRingRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.3, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ── Realistic Container Mesh with PBR Materials & Structural Detail ────
const ContainerMesh = ({
  position,
  color,
  brand,
  serial,
  onClick,
  isInteractive,
  hasOpeningDoors,
  doorOpenProgress,
  interiorType,
  isInteriorActive,
  tickerTex,
  isContainerA
}) => {
  const [hovered, setHovered] = useState(false);
  const hoverCageRef = useRef();

  // Cached PBR Textures
  const sideTex = useMemo(() => createContainerTexture(color, brand, serial, 'side'), [color, brand, serial]);
  const topTex = useMemo(() => createContainerTexture(color, brand, serial, 'top'), [color, brand, serial]);
  const doorTex = useMemo(() => createContainerTexture(color, brand, serial, 'door'), [color, brand, serial]);

  const sideNormal = useMemo(() => createCorrugationNormalMap('side'), []);
  const sideRoughness = useMemo(() => createCorrugationRoughnessMap('side'), []);
  const doorNormal = useMemo(() => createCorrugationNormalMap('door'), []);
  const doorRoughness = useMemo(() => createCorrugationRoughnessMap('door'), []);

  // Subtle breathing outline pulse on hover
  useFrame((state) => {
    if (isInteractive && hovered && hoverCageRef.current) {
      const pulse = 0.28 + 0.14 * Math.sin(state.clock.elapsedTime * 8);
      hoverCageRef.current.material.opacity = pulse;
    }
  });

  const emissiveColor = isInteractive && hovered ? '#10b981' : '#000000';
  const emissiveIntensity = isInteractive && hovered ? 0.2 : 0;

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
        {/* +X right side (Door Face) */}
        {hasOpeningDoors ? (
          <meshBasicMaterial attach="material-0" transparent opacity={0} />
        ) : (
          <meshStandardMaterial
            attach="material-0"
            map={doorTex}
            normalMap={doorNormal}
            normalScale={new THREE.Vector2(0.8, 0.8)}
            roughnessMap={doorRoughness}
            roughness={0.42}
            metalness={0.65}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
          />
        )}
        {/* -X left side (Closed end) */}
        <meshStandardMaterial
          attach="material-1"
          map={doorTex}
          normalMap={doorNormal}
          normalScale={new THREE.Vector2(0.8, 0.8)}
          roughnessMap={doorRoughness}
          roughness={0.42}
          metalness={0.65}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
        {/* +Y top */}
        <meshStandardMaterial 
          attach="material-2" 
          map={topTex} 
          roughness={0.55} 
          metalness={0.5} 
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity * 0.5}
        />
        {/* -Y bottom */}
        <meshStandardMaterial attach="material-3" color={color} roughness={0.8} metalness={0.2} />
        {/* +Z front (Long side facing camera) */}
        {isContainerA && tickerTex ? (
          <meshStandardMaterial
            attach="material-4"
            map={tickerTex}
            normalMap={sideNormal}
            normalScale={new THREE.Vector2(0.65, 0.65)}
            roughnessMap={sideRoughness}
            roughness={0.38}
            metalness={0.55}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity * 0.7}
          />
        ) : (
          <meshStandardMaterial
            attach="material-4"
            map={sideTex}
            normalMap={sideNormal}
            normalScale={new THREE.Vector2(0.85, 0.85)}
            roughnessMap={sideRoughness}
            roughness={0.45}
            metalness={0.65}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
          />
        )}
        {/* -Z back (Long side) */}
        <meshStandardMaterial
          attach="material-5"
          map={sideTex}
          normalMap={sideNormal}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughnessMap={sideRoughness}
          roughness={0.45}
          metalness={0.65}
        />
      </mesh>

      {/* Subtle Holographic Bounding Wireframe on Hover */}
      {isInteractive && hovered && (
        <mesh ref={hoverCageRef} position={[0, 0, 0]}>
          <boxGeometry args={[3.04, 1.34, 1.24]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.32} />
        </mesh>
      )}

      {/* Structural Corner Blocks & Frame Rails */}
      <CornerCastings />
      <FrameRails />

      {/* Opening Doors & Interior Payloads for Containers B & C */}
      {hasOpeningDoors ? (
        <>
          <InteriorChamber />
          <OpeningDoors
            doorOpenProgress={doorOpenProgress}
            doorTex={doorTex}
            doorNormal={doorNormal}
            doorRoughness={doorRoughness}
            isHovered={isInteractive && hovered}
          />
          {interiorType === 'network' && (
            <InteriorNetworkNodeCluster isOpen={isInteriorActive} />
          )}
          {interiorType === 'nasa' && (
            <InteriorNasaRiskGlobe isOpen={isInteriorActive} />
          )}
        </>
      ) : (
        <DoorLockingHardware />
      )}
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

// Fictional brand names only
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
  const gapY = 1.34;
  const gapZ = 1.24;
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
const AnimatedContainer = ({ c, activeTab, onTabClick, tickerTex }) => {
  let offsetX = 0;
  let offsetZ = 0;
  let isTarget = false;
  let labelData = null;
  let isContainerA = false;
  let hasOpeningDoors = false;
  let interiorType = null;
  let isDoorOpen = false;

  // The 3 front-facing containers assigned to the interactive tabs
  if (c.id === 'c-1-1') {
    isTarget = true;
    isContainerA = true;
    labelData = { marker: 'A', title: 'ALL FEEDS', tab: 'feed' };
    if (activeTab === 'feed') {
      offsetX = 0.35;
      offsetZ = 0.95;
    }
  } else if (c.id === 'c-0-1') {
    isTarget = true;
    hasOpeningDoors = true;
    interiorType = 'network';
    labelData = { marker: 'B', title: 'SEMANTIC AI SEARCH', tab: 'search' };
    if (activeTab === 'search') {
      offsetX = 0.35;
      offsetZ = 0.95;
      isDoorOpen = true;
    }
  } else if (c.id === 'c--1-1') {
    isTarget = true;
    hasOpeningDoors = true;
    interiorType = 'nasa';
    labelData = { marker: 'C', title: 'NASA SATELLITE', tab: 'analytics' };
    if (activeTab === 'analytics') {
      offsetX = 0.35;
      offsetZ = 0.95;
      isDoorOpen = true;
    }
  }

  const targetPos = [c.pos[0] + offsetX, c.pos[1], c.pos[2] + offsetZ];

  const { position, doorOpenProgress } = useSpring({
    position: targetPos,
    doorOpenProgress: isDoorOpen ? 1 : 0,
    config: { mass: 1.5, tension: 75, friction: 22 }
  });

  const isActive = labelData && activeTab === labelData.tab;

  return (
    <animated.group position={position}>
      <ContainerMesh 
        position={[0, 0, 0]} 
        color={c.color} 
        brand={c.brand} 
        serial={c.serial} 
        isInteractive={isTarget}
        hasOpeningDoors={hasOpeningDoors}
        doorOpenProgress={doorOpenProgress}
        interiorType={interiorType}
        isInteriorActive={isDoorOpen}
        tickerTex={tickerTex}
        isContainerA={isContainerA}
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
const Stack = ({ activeTab, onTabClick, articles }) => {
  const floatRef = useRef();
  const containers = useMemo(() => buildContainerWall(), []);

  // Real-time news ticker canvas texture for Container A
  const tickerTex = useLiveTickerTexture(articles);

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
            tickerTex={tickerTex}
          />
        ))}
      </group>
    </group>
  );
};

// ── Smooth 700ms Camera Easing Controller ─────────────────────────────
const CameraController = ({ activeTab }) => {
  const { camera } = useThree();
  const controlsRef = useRef();

  // Targets and positions tailored for each container's feature focus
  const { camPos, camTarget } = useMemo(() => {
    switch (activeTab) {
      case 'feed':
        // Focus on Container A (top front), framing the live news ticker
        return {
          camPos: new THREE.Vector3(7.4, 4.8, 7.6),
          camTarget: new THREE.Vector3(0.3, 0.85, 0.35)
        };
      case 'search':
        // Focus on Container B (middle front), 3/4 angle peering inside open doors
        return {
          camPos: new THREE.Vector3(7.9, 4.2, 7.3),
          camTarget: new THREE.Vector3(0.35, 0.05, 0.3)
        };
      case 'analytics':
        // Focus on Container C (bottom front), showcasing rotating holographic risk globe
        return {
          camPos: new THREE.Vector3(7.6, 3.6, 7.5),
          camTarget: new THREE.Vector3(0.3, -0.75, 0.3)
        };
      default: // 'overview'
        // Balanced symmetrical isometric view of full 3x3 stack
        return {
          camPos: new THREE.Vector3(8.0, 5.0, 8.0),
          camTarget: new THREE.Vector3(0.0, 0.0, 0.0)
        };
    }
  }, [activeTab]);

  useFrame((state, delta) => {
    // 700ms smooth exponential ease-out (factor 4.6 * delta reaches ~96% convergence in 700ms)
    const factor = Math.min(1, delta * 4.6);
    camera.position.lerp(camPos, factor);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(camTarget, factor);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0, 0]}
      enableZoom={false}
      enablePan={false}
      enableRotate={false}
    />
  );
};

// ── Main Export ────────────────────────────────────────────────────────
export default function Hero3DContainer({ activeTab, onTabClick, articles = [] }) {
  // Dispose all cached procedural PBR textures if Hero3DContainer unmounts
  useEffect(() => {
    return () => {
      textureCache.forEach((tex) => {
        try {
          tex.dispose();
        } catch (e) {}
      });
      textureCache.clear();
    };
  }, []);

  return (
    <Canvas
      shadows
      camera={{ position: [8, 5, 8], fov: 40 }}
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      }}
      onCreated={({ gl }) => {
        const dom = gl.domElement;
        const onLost = (e) => {
          e.preventDefault();
          console.warn('WebGL context lost. Canvas will attempt automatic recovery.');
        };
        const onRestored = () => {
          console.info('WebGL context restored successfully.');
        };
        dom.addEventListener('webglcontextlost', onLost, false);
        dom.addEventListener('webglcontextrestored', onRestored, false);
      }}
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

      <Stack activeTab={activeTab} onTabClick={onTabClick} articles={articles} />

      {/* Soft Ground Shadow Receiver */}
      <mesh position={[0, -1.25, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <shadowMaterial opacity={0.38} />
      </mesh>

      {/* Ground Contact Shadows */}
      <ContactShadows
        position={[0, -1.24, 0]}
        opacity={0.72}
        scale={14}
        blur={1.8}
        far={3.2}
        resolution={1024}
        color="#040605"
      />

      {/* Smooth 700ms Camera Easing Controller */}
      <CameraController activeTab={activeTab} />
    </Canvas>
  );
}
