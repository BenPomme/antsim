import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { Group, Vector3 } from 'three';
import { Colony, ColonyRelation, Resource } from '../store/gameStore';
import { useStore } from '../store/gameStore';

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
const Ant = ({ 
  position, 
  color, 
  index, 
  colonyPosition,
  isPlayerColony
}: { 
  position: [number, number, number], 
  color: string, 
  index: number,
  colonyPosition: [number, number, number],
  isPlayerColony: boolean
}) => {
  const antRef = useRef<Group>(null);
  const { resources, playerPosition, collectResource, health } = useStore();
  
  // Each ant has a state to determine its behavior
  const [state, setState] = useState<'idle' | 'hunting' | 'returning' | 'fighting'>('idle');
  const [targetResource, setTargetResource] = useState<Resource | null>(null);
  const [carryingResource, setCarryingResource] = useState(false);
  const [position3D] = useState(new Vector3(...position));
  const [velocity] = useState(new Vector3());
  const [targetPosition] = useState(new Vector3());
  const [resourceValue, setResourceValue] = useState(0);
  const [resourceType, setResourceType] = useState<'food' | 'material'>('food');
  
  // AI behavior decision timer
  useEffect(() => {
    const decideAction = () => {
      if (state === 'idle') {
        // Find a nearby resource if we're idle
        if (!isPlayerColony) return; // Only player colony ants hunt resources for now
        
        // Find closest resource
        let closestResource: Resource | null = null;
        let closestDistance = Number.MAX_VALUE;
        
        resources.forEach(resource => {
          const resourcePos = new Vector3(...resource.position);
          const distance = position3D.distanceTo(resourcePos);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestResource = resource;
          }
        });
        
        if (closestResource && closestDistance < 20) {
          setTargetResource(closestResource);
          setState('hunting');
          targetPosition.set(...closestResource.position);
        }
      }
    };
    
    const interval = setInterval(decideAction, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [state, resources, position3D, isPlayerColony, targetPosition]);
  
  useFrame((_, delta) => {
    if (!antRef.current) return;
    
    const time = Date.now() * 0.001;
    const offset = index * 0.5;
    
    // Different behavior based on the ant's state
    if (state === 'idle') {
      // Wander around the colony
      const wanderRadius = 2 + Math.sin(time * 0.3 + index) * 0.5;
      const wanderAngle = time * 0.5 + offset;
      
      position3D.set(
        colonyPosition[0] + Math.cos(wanderAngle) * wanderRadius,
        0,
        colonyPosition[2] + Math.sin(wanderAngle) * wanderRadius
      );
      
      antRef.current.position.copy(position3D);
      antRef.current.rotation.y = wanderAngle + Math.PI / 2;
    } 
    else if (state === 'hunting' && targetResource) {
      // Move towards the target resource
      const resourcePos = new Vector3(...targetResource.position);
      const distance = position3D.distanceTo(resourcePos);
      
      if (distance < 0.5) {
        // Reached the resource, collect it
        setCarryingResource(true);
        setResourceValue(targetResource.value);
        setResourceType(targetResource.type);
        collectResource(targetResource.id);
        setState('returning');
      } else {
        // Move towards the resource
        velocity.subVectors(resourcePos, position3D).normalize().multiplyScalar(delta * 2);
        position3D.add(velocity);
        
        // Rotation towards movement direction
        antRef.current.rotation.y = Math.atan2(velocity.z, velocity.x) - Math.PI / 2;
      }
      
      antRef.current.position.copy(position3D);
    }
    else if (state === 'returning') {
      // Return to colony
      const colonyPos = new Vector3(...colonyPosition);
      const distance = position3D.distanceTo(colonyPos);
      
      if (distance < 0.5) {
        // Reached the colony, deposit resources
        setCarryingResource(false);
        setState('idle');
      } else {
        // Move towards colony
        velocity.subVectors(colonyPos, position3D).normalize().multiplyScalar(delta * 2);
        position3D.add(velocity);
        
        // Rotation towards movement direction
        antRef.current.rotation.y = Math.atan2(velocity.z, velocity.x) - Math.PI / 2;
      }
      
      antRef.current.position.copy(position3D);
    }
    else if (state === 'fighting') {
      // Fight with enemy ants or defend colony
      // This would include movement towards enemies and combat animations
    }
    
    // Leg animation
    if (state !== 'idle') {
      const walkSpeed = state === 'returning' ? 16 : 12; // Faster when carrying
      antRef.current.children.forEach((child, i) => {
        if (child.name.includes('leg')) {
          // Alternating leg movement
          const phase = i % 2 === 0 ? 0 : Math.PI;
          child.rotation.x = Math.sin(time * walkSpeed + i + phase) * 0.3;
        }
      });
    }
  });
  
  return (
    <group ref={antRef} position={position} name={`ant-${index}`}>
      {/* Ant body */}
      <group name="body">
        {/* Head */}
        <mesh castShadow position={[0, 0.1, 0.15]} name="head">
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Thorax */}
        <mesh castShadow position={[0, 0.15, 0]} name="thorax">
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Abdomen */}
        <mesh castShadow position={[0, 0.15, -0.25]} name="abdomen">
          <sphereGeometry args={[0.15, 14, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Legs - more detailed and segmented */}
        {[...Array(3)].map((_, i) => (
          <group key={`leg-left-${i}`} name={`leg-left-${i}`} position={[0, 0.1, -0.1 + i * 0.15]}>
            <mesh castShadow rotation={[0, 0, Math.PI / 3]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh castShadow position={[0.12, -0.05, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} rotation={[0, 0, Math.PI / 3]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        ))}
        
        {[...Array(3)].map((_, i) => (
          <group key={`leg-right-${i}`} name={`leg-right-${i}`} position={[0, 0.1, -0.1 + i * 0.15]}>
            <mesh castShadow rotation={[0, 0, -Math.PI / 3]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh castShadow position={[-0.12, -0.05, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} rotation={[0, 0, -Math.PI / 3]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        ))}
        
        {/* Antennae */}
        <group position={[0, 0.15, 0.15]} name="antennae">
          <mesh castShadow position={[0.05, 0.05, 0.08]} rotation={[Math.PI / 4, 0, Math.PI / 8]}>
            <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          
          <mesh castShadow position={[-0.05, 0.05, 0.08]} rotation={[Math.PI / 4, 0, -Math.PI / 8]}>
            <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
        
        {/* Resource being carried (if any) */}
        {carryingResource && (
          <mesh 
            position={[0, 0.3, 0]} 
            castShadow
            name="carried-resource"
          >
            {resourceType === 'food' ? (
              <sphereGeometry args={[0.08, 8, 8]} />
            ) : (
              <boxGeometry args={[0.1, 0.1, 0.1]} />
            )}
            <meshStandardMaterial color={resourceType === 'food' ? '#00cc00' : '#cc9900'} />
          </mesh>
        )}
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
        {/* Main ant hill - more detailed */}
        <mesh castShadow receiveShadow>
          <coneGeometry args={[colonySize, colonySize * 1.5, 32]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
        
        {/* Colony entrance */}
        <mesh position={[0, colonySize * 0.5, 0]} castShadow>
          <cylinderGeometry args={[colonySize * 0.3, colonySize * 0.3, colonySize * 0.5, 16]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        
        {/* Add soil texture and details to the colony */}
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i / 10) * Math.PI * 2;
          const radius = colonySize * 0.7;
          const posX = Math.cos(angle) * radius;
          const posZ = Math.sin(angle) * radius;
          return (
            <mesh 
              key={`soil-${i}`}
              position={[posX, colonySize * 0.2, posZ]} 
              rotation={[Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5]}
              castShadow
            >
              <boxGeometry args={[colonySize * 0.2, colonySize * 0.05, colonySize * 0.2]} />
              <meshStandardMaterial color={color === '#ff9900' ? '#cc7700' : '#666666'} />
            </mesh>
          );
        })}
        
        {/* Size indicator - more elegant */}
        {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
          <mesh 
            key={`level-${i}`}
            position={[
              Math.sin(i / 5 * Math.PI * 2) * colonySize * 0.8,
              colonySize * 0.1,
              Math.cos(i / 5 * Math.PI * 2) * colonySize * 0.8
            ]}
            castShadow
          >
            <boxGeometry args={[colonySize * 0.2, colonySize * 0.1, colonySize * 0.2]} />
            <meshStandardMaterial color={color} metalness={0.5} roughness={0.5} />
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
          {/* Render worker ants around the colony */}
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
                key={`ant-${i}`}
                position={antPosition}
                color={isPlayerColony ? '#ff9900' : getColonyColor(relation)}
                index={i}
                colonyPosition={position}
                isPlayerColony={isPlayerColony}
              />
            );
          })}
        </>
      ) : (
        <group ref={ref as any}>
          {renderColony()}
          {/* Render enemy ants around the colony */}
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
                key={`enemy-ant-${i}`}
                position={antPosition}
                color={getColonyColor(relation)}
                index={i}
                colonyPosition={position}
                isPlayerColony={false}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};

export default AntColony; 