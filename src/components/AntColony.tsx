import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { useStore, Colony, ColonyRelation } from '../store/gameStore';
import { Group } from 'three';

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
  
  // If player colony, it should stay at fixed position
  // No longer following the player position
  
  // Animate colony based on type
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // For player colony, we don't need to update position anymore
    // Just keep it in place
    
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
        renderColony()
      ) : (
        <group ref={ref as any}>
          {renderColony()}
        </group>
      )}
    </group>
  );
};

export default AntColony; 