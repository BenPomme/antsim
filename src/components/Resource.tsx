import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { useStore } from '../store/gameStore';
import { Resource as ResourceType } from '../store/gameStore';
import * as THREE from 'three';

interface ResourceProps {
  resource: ResourceType;
}

// Component for food resources (leaves, etc)
const FoodResource = ({ position, value }: { position: [number, number, number], value: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      // Gentle hovering animation
      groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.002) * 0.1;
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  // Scale based on value
  const scale = 0.6 + (value / 10) * 0.4;
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Main leaf */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
        <meshStandardMaterial color="#117711" />
      </mesh>
      
      {/* Leaf body */}
      <mesh castShadow receiveShadow position={[0, 0.15, 0]} rotation={[Math.PI / 16, 0, 0]}>
        <coneGeometry args={[0.3, 0.6, 5]} />
        <meshStandardMaterial color="#22cc22" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Some additional small leaves for higher value resources */}
      {value > 5 && (
        <>
          <mesh castShadow receiveShadow position={[0.1, 0.15, 0.1]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.2, 0.4, 5]} />
            <meshStandardMaterial color="#33dd33" side={THREE.DoubleSide} />
          </mesh>
          <mesh castShadow receiveShadow position={[-0.1, 0.1, -0.1]} rotation={[0, -Math.PI / 4, 0]}>
            <coneGeometry args={[0.2, 0.4, 5]} />
            <meshStandardMaterial color="#44ee44" side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      
      {/* Emissive glow to make it more noticeable */}
      <pointLight color="#22ff22" intensity={0.5} distance={1} position={[0, 0.2, 0]} />
    </group>
  );
};

// Component for material resources (twigs, stones, etc)
const MaterialResource = ({ position, value }: { position: [number, number, number], value: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      // Subtle pulsing animation
      const scale = 1 + Math.sin(Date.now() * 0.001) * 0.05;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  // Scale based on value
  const baseScale = 0.5 + (value / 10) * 0.5;
  
  return (
    <group ref={groupRef} position={position} scale={baseScale}>
      {/* Main twig */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 6]}>
        <cylinderGeometry args={[0.06, 0.04, 0.8, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.9} />
      </mesh>
      
      {/* Some small branches */}
      <mesh castShadow receiveShadow position={[0.1, 0.2, 0]} rotation={[0, 0, Math.PI / 3]}>
        <cylinderGeometry args={[0.03, 0.02, 0.4, 6]} />
        <meshStandardMaterial color="#A0522D" roughness={0.8} />
      </mesh>
      
      {/* For higher value resources, add some rocks */}
      {value > 5 && (
        <>
          <mesh castShadow receiveShadow position={[-0.15, 0.05, 0.1]}>
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshStandardMaterial color="#888888" roughness={0.7} />
          </mesh>
          <mesh castShadow receiveShadow position={[-0.2, 0.1, -0.1]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#777777" roughness={0.8} />
          </mesh>
        </>
      )}
      
      {/* Subtle glow */}
      <pointLight color="#ffaa77" intensity={0.3} distance={0.8} position={[0, 0.1, 0]} />
    </group>
  );
};

export default function Resource({ resource }: ResourceProps) {
  const { position, type, value } = resource;
  const { collectResource, playerPosition } = useStore();
  const [ref] = useBox(() => ({
    mass: 0,
    position,
    args: [0.8, 0.8, 0.8], // Slightly larger collision box
    type: 'Static',
  }));

  useFrame(() => {
    if (!ref.current) return;

    const distance = ref.current.position.distanceTo(
      new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2])
    );

    if (distance < 2) {
      collectResource(resource.id);
    }
  });

  return (
    <group ref={ref as any}>
      {type === 'food' ? (
        <FoodResource position={position} value={value} />
      ) : (
        <MaterialResource position={position} value={value} />
      )}
    </group>
  );
} 