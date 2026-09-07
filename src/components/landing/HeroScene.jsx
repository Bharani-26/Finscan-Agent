import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const NEON_WHITE = '#FFFFFF';
const WARM_GOLD = '#F5C542';
const SILVER = '#C7D2FE';

function Coin({ position, scale = 1, speed = 1, color = WARM_GOLD }) {
  const group = useRef();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.7 * speed;
    group.current.rotation.x = Math.sin(Date.now() * 0.0004 * speed) * 0.25;
  });

  return (
    <Float speed={1.4 * speed} rotationIntensity={0.2} floatIntensity={0.6}>
      <group ref={group} position={position} scale={scale} rotation={[0.4, 0.2, 0.1]}>
        <mesh>
          <cylinderGeometry args={[0.55, 0.55, 0.08, 48]} />
          <meshStandardMaterial
            color={color}
            metalness={0.85}
            roughness={0.18}
            emissive={color}
            emissiveIntensity={0.35}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[0.55, 0.045, 12, 48]} />
          <meshStandardMaterial
            color={NEON_WHITE}
            emissive={NEON_WHITE}
            emissiveIntensity={1.4}
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.32, 32]} />
          <meshBasicMaterial color={SILVER} transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </Float>
  );
}

function NetworkGraph() {
  const group = useRef();

  const { positions, nodePositions } = useMemo(() => {
    const count = 28;
    const nodePositions = [];
    for (let i = 0; i < count; i += 1) {
      const theta = (i / count) * Math.PI * 2;
      const phi = Math.acos((i % 7) / 6 * 2 - 1);
      const radius = 4.2 + (i % 5) * 0.28;
      nodePositions.push(
        new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * radius,
          Math.cos(phi) * 1.6,
          Math.sin(phi) * Math.sin(theta) * radius - 1.4
        )
      );
    }

    const connections = [];
    for (let i = 0; i < count; i += 1) {
      for (let j = i + 1; j < count; j += 1) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < 2.6) {
          connections.push(nodePositions[i], nodePositions[j]);
        }
      }
    }

    return {
      positions: new Float32Array(connections.flatMap((v) => [v.x, v.y, v.z])),
      nodePositions,
    };
  }, []);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group ref={group}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={NEON_WHITE} transparent opacity={0.28} />
      </lineSegments>
      {nodePositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.055 + (i % 3) * 0.02, 16, 16]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? NEON_WHITE : SILVER}
            emissive={i % 2 === 0 ? NEON_WHITE : SILVER}
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ChartRibbon({ offset = [0, 0, 0], color = NEON_WHITE, phase = 0 }) {
  const lineRef = useRef();
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 48; i += 1) {
      const x = (i / 47) * 3.6 - 1.8;
      const y = Math.sin(i * 0.35 + phase) * 0.55 + Math.sin(i * 0.12) * 0.2;
      pts.push(new THREE.Vector3(x, y, 0));
    }
    return pts;
  }, [phase]);

  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
  }, [points]);

  useFrame((state) => {
    if (!lineRef.current) return;
    const t = state.clock.elapsedTime;
    const pts = [];
    for (let i = 0; i < 48; i += 1) {
      const x = (i / 47) * 3.6 - 1.8;
      const y = Math.sin(i * 0.35 + phase + t * 0.8) * 0.55 + Math.cos(i * 0.18 + t) * 0.22;
      pts.push(new THREE.Vector3(x, y, 0));
    }
    lineRef.current.geometry.setFromPoints(pts);
  });

  return (
    <group position={offset} rotation={[-0.35, 0.4, 0.05]}>
      <mesh position={[0, -0.85, -0.08]}>
        <planeGeometry args={[3.9, 1.9]} />
        <meshStandardMaterial
          color="#071226"
          transparent
          opacity={0.55}
          metalness={0.2}
          roughness={0.6}
          emissive={SILVER}
          emissiveIntensity={0.08}
        />
      </mesh>
      <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial color={color} />
      </line>
    </group>
  );
}

function NeonPlatforms() {
  return (
    <group position={[0, -2.35, 0]}>
      {[-2.2, 0, 2.2].map((x, i) => (
        <mesh key={x} position={[x, i === 1 ? 0.12 : 0, -1.4 + i * 0.2]} rotation={[-Math.PI / 2, 0, 0.2]}>
          <boxGeometry args={[1.6, 1.6, 0.18]} />
          <meshStandardMaterial
            color="#05070d"
            metalness={0.5}
            roughness={0.4}
            emissive={i % 2 ? SILVER : NEON_WHITE}
            emissiveIntensity={0.45}
          />
        </mesh>
      ))}
    </group>
  );
}

function Particles() {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(450);
    for (let i = 0; i < 150; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color={NEON_WHITE} transparent opacity={0.7} />
    </points>
  );
}

function SceneContents() {
  const camGroup = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (camGroup.current) {
      camGroup.current.position.x = Math.sin(t * 0.12) * 0.35;
      camGroup.current.position.y = Math.cos(t * 0.09) * 0.18;
    }
  });

  return (
    <>
      <fog attach="fog" args={['#0f172a', 8, 22]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[4, 6, 4]} intensity={40} color={NEON_WHITE} distance={22} />
      <pointLight position={[-5, 3, -2]} intensity={28} color={SILVER} distance={18} />
      <pointLight position={[0, -2, 4]} intensity={16} color={NEON_WHITE} distance={14} />
      <group ref={camGroup}>
        <NetworkGraph />
        <NeonPlatforms />
        <Particles />
        <Coin position={[-3.4, 1.4, 1.2]} scale={1.05} speed={0.9} />
        <Coin position={[3.6, 0.7, 0.6]} scale={0.85} speed={1.2} color="#E8D48B" />
        <Coin position={[-2.2, -0.6, 2.4]} scale={0.62} speed={1.4} />
        <Coin position={[2.1, 2.1, -0.8]} scale={0.7} speed={0.8} color={SILVER} />
        <Coin position={[0.8, -1.1, 2.1]} scale={0.55} speed={1.1} />
        <Coin position={[-4.1, 0.2, -0.4]} scale={0.48} speed={1.5} />
        <ChartRibbon offset={[-3.8, -0.2, -1.6]} color={NEON_WHITE} phase={0.4} />
        <ChartRibbon offset={[3.4, 0.5, -2]} color={SILVER} phase={1.8} />
      </group>
    </>
  );
}

export default function HeroScene() {
  return (
    <Canvas dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }} className="hero-canvas">
      <PerspectiveCamera makeDefault position={[0, 0.6, 9.2]} fov={48} />
      <SceneContents />
    </Canvas>
  );
}
