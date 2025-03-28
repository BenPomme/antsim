import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { Group } from 'three';
import { Colony, ColonyRelation } from '../store/gameStore';

interface AntColonyProps {
  colony: Colony;
  isPlayerColony?: boolean;
}

// Helper function to get color based on relation
const getColonyColor = (relation: ColonyRelation): string => {
  switch (relation) {
    case 'ally': return '#33ff33';
    case 'enemy': return '#ff3333';
    case 'neutral': return '#cccccc';
    default: return '#ff9900'; // player colony
  }
};

// Component to render a detailed ant
const Ant = ({ position, color, index }: { position: [number, number, number], color: string, index: number }) => {
  const antRef = useRef<Group>(null);
  
  useFrame((_, delta) => {
    if (!antRef.current) return;
    
    // Add movement animation
    const time = Date.now() * 0.001;
    const offset = index * 0.5;
    
    // Make ants walk around the colony
    antRef.current.position.x = position[0] + Math.sin(time + offset) * 0.2;
    antRef.current.position.z = position[2] + Math.cos(time + offset) * 0.2;
    
    // Rotate ants in the direction they're moving
    antRef.current.rotation.y = Math.atan2(
      Math.cos(time + offset),
      -Math.sin(time + offset)
    );
  });
  
  return (
    <group ref={antRef} position={position}>
      {/* Ant body */}
      <group>
        {/* Head */}
        <mesh castShadow position={[0.15, 0.1, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Thorax */}
        <mesh castShadow position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Abdomen */}
        <mesh castShadow position={[-0.2, 0.1, 0]}>
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Legs */}
        {[...Array(3)].map((_, i) => (
          <group key={`leg-left-${i}`}>
            <mesh castShadow position={[0.05 - i * 0.1, 0.1, 0.1]}>
              <boxGeometry args={[0.05, 0.05, 0.2]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        ))}
        
        {[...Array(3)].map((_, i) => (
          <group key={`leg-right-${i}`}>
            <mesh castShadow position={[0.05 - i * 0.1, 0.1, -0.1]}>
              <boxGeometry args={[0.05, 0.05, 0.2]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        ))}
        
        {/* Antennae */}
        <mesh castShadow position={[0.2, 0.15, 0.05]}>
          <boxGeometry args={[0.1, 0.02, 0.02]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        <mesh castShadow position={[0.2, 0.15, -0.05]}>
          <boxGeometry args={[0.1, 0.02, 0.02]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>
    </group>
  );
};

const AntColony = ({ colony, isPlayerColony = false }: AntColonyProps) => {
  const { position, size, level, relation } = colony;
  const groupRef = useRef<Group>(null);
  
  // Colony size affects physical size
  const colonySize = Math.log(size + 10) * level * 0.5;
  
  // Only create physics for non-player colonies
  const [ref] = useBox(() => ({
    args: [colonySize * 2, colonySize, colonySize * 2],
    position,
    type: 'Static',
  }));
  
  // Animate colony based on type
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Add some subtle animation
    groupRef.current.rotation.y += delta * 0.2;
    
    // Enemy colonies might have more aggressive animation
    if (relation === 'enemy') {
      groupRef.current.scale.x = Math.sin(Date.now() * 0.003) * 0.05 + 1;
      groupRef.current.scale.z = Math.sin(Date.now() * 0.003) * 0.05 + 1;
    }
  });
  
  // Different colony types have different appearances
  const renderColony = () => {
    const color = isPlayerColony ? '#ff9900' : getColonyColor(relation);
    
    return (
      <group ref={groupRef}>
        {/* Main ant hill */}
        <mesh castShadow receiveShadow>
          <coneGeometry args={[colonySize, colonySize * 1.5, 32]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Colony entrance */}
        <mesh position={[0, colonySize * 0.5, 0]} castShadow>
          <cylinderGeometry args={[colonySize * 0.3, colonySize * 0.3, colonySize * 0.5, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        
        {/* Size indicator */}
        {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
          <mesh 
            key={i}
            position={[
              Math.sin(i / 5 * Math.PI * 2) * colonySize * 0.8,
              colonySize * 0.1,
              Math.cos(i / 5 * Math.PI * 2) * colonySize * 0.8
            ]}
            castShadow
          >
            <boxGeometry args={[colonySize * 0.2, colonySize * 0.1, colonySize * 0.2]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
    );
  };
  
  return (
    <group position={position}>
      {isPlayerColony ? (
        <>
          {renderColony()}
          {/* Render detailed ants around the colony */}
          {Array.from({ length: size }).map((_, i) => {
            const angle = (i / size) * Math.PI * 2;
            const radius = colonySize * 1.5;
            const antPosition: [number, number, number] = [
              Math.cos(angle) * radius,
              0,
              Math.sin(angle) * radius
            ];
            
            return (
              <Ant 
                key={`detailed-ant-${i}`}
                position={antPosition}
                color={isPlayerColony ? '#ff9900' : getColonyColor(relation)}
                index={i}
              />
            );
          })}
        </>
      ) : (
        <group ref={ref as any}>
          {renderColony()}
          {/* Render detailed ants around the colony */}
          {Array.from({ length: size }).map((_, i) => {
            const angle = (i / size) * Math.PI * 2;
            const radius = colonySize * 1.5;
            const antPosition: [number, number, number] = [
              Math.cos(angle) * radius,
              0,
              Math.sin(angle) * radius
            ];
            
            return (
              <Ant 
                key={`detailed-ant-${i}`}
                position={antPosition}
                color={isPlayerColony ? '#ff9900' : getColonyColor(relation)}
                index={i}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};

export default AntColony; 