import { useMemo, useRef } from 'react';
import { useBox } from '@react-three/cannon';
import { RepeatWrapping, MeshStandardMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/gameStore';

// Procedural terrain generation function
const generateTerrainHeight = (x: number, z: number, scale = 0.1) => {
  // Simple Perlin-like noise approximation
  return Math.sin(x * scale) * Math.cos(z * scale) * 2;
};

// Generate obstacle positions
const generateObstaclePositions = (count: number, radius: number) => {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    positions.push({
      position: [
        Math.cos(angle) * distance,
        Math.random() * 2, // Random height
        Math.sin(angle) * distance
      ] as [number, number, number],
      scale: [
        Math.random() * 2 + 1,
        Math.random() * 3 + 1,
        Math.random() * 2 + 1
      ] as [number, number, number],
      rotation: Math.random() * Math.PI * 2,
      type: Math.random() > 0.7 ? 'rock' : 'plant'
    });
  }
  return positions;
};

const Ground = () => {
  const worldSize = useStore(state => state.worldSize);
  const obstacles = useMemo(() => generateObstaclePositions(50, 100), []);
  const grassMaterialRef = useRef<MeshStandardMaterial>(null);

  // Create physics body for ground
  const [ref] = useBox(() => ({
    args: [worldSize, 1, worldSize],
    position: [0, -0.5, 0],
    type: 'Static',
  }));

  // Create a visual representation of the terrain
  const terrainSegments = 20; // Number of segments for the terrain (adjust for performance)
  const terrainSize = 500; // Size of the detailed terrain around the player
  
  // Animate grass material
  useFrame((_, delta) => {
    if (grassMaterialRef.current) {
      // Subtle color shift for grass
      const time = Date.now() * 0.0002;
      const greenValue = 0.5 + Math.sin(time) * 0.05;
      grassMaterialRef.current.color.setRGB(0.2, greenValue, 0.1);
    }
  });

  return (
    <>
      {/* Main ground physics body */}
      <mesh ref={ref as any} receiveShadow>
        <boxGeometry args={[worldSize, 1, worldSize]} />
        <meshStandardMaterial color="#553311" />
      </mesh>
      
      {/* Detailed grass terrain */}
      <mesh position={[0, 0, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry 
          args={[terrainSize, terrainSize, terrainSegments, terrainSegments]} 
        />
        <meshStandardMaterial 
          ref={grassMaterialRef}
          color="#33aa33" 
          displacementScale={2}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Add decorative grid lines for better spatial awareness */}
      <gridHelper args={[500, 50, "#ffffff", "#666666"]} position={[0, 0.01, 0]} />
      
      {/* Sky dome */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[worldSize / 2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#87CEEB" side={2} fog={false} />
      </mesh>
      
      {/* Obstacles - rocks and plants */}
      {obstacles.map((obstacle, i) => (
        <group 
          key={`obstacle-${i}`} 
          position={obstacle.position}
          rotation={[0, obstacle.rotation, 0]}
        >
          {obstacle.type === 'rock' ? (
            <mesh castShadow receiveShadow scale={obstacle.scale}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#777777" roughness={0.8} />
            </mesh>
          ) : (
            <mesh castShadow receiveShadow scale={obstacle.scale}>
              <coneGeometry args={[0.5, 2, 4]} />
              <meshStandardMaterial color="#005500" />
            </mesh>
          )}
        </group>
      ))}
      
      {/* Large landmark obstacles for orientation */}
      <group position={[50, 0, 0]}>
        <mesh castShadow receiveShadow position={[0, 5, 0]}>
          <boxGeometry args={[5, 10, 5]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
      </group>
      
      <group position={[0, 0, 50]}>
        <mesh castShadow receiveShadow position={[0, 5, 0]}>
          <cylinderGeometry args={[2, 4, 10]} />
          <meshStandardMaterial color="#0000ff" />
        </mesh>
      </group>
      
      <group position={[-50, 0, 0]}>
        <mesh castShadow receiveShadow position={[0, 5, 0]}>
          <torusGeometry args={[4, 1, 16, 32]} />
          <meshStandardMaterial color="#ffff00" />
        </mesh>
      </group>
      
      <group position={[0, 0, -50]}>
        <mesh castShadow receiveShadow position={[0, 7, 0]}>
          <tetrahedronGeometry args={[5]} />
          <meshStandardMaterial color="#00ff00" />
        </mesh>
      </group>
    </>
  );
};

export default Ground; 