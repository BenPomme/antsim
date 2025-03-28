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
  const { resources, collectResource } = useStore();
  
  // Each ant has a state to determine its behavior
  const [state, setState] = useState<'idle' | 'hunting' | 'returning' | 'fighting' | 'exploring'>('idle');
  const [targetResource, setTargetResource] = useState<Resource | null>(null);
  const [carryingResource, setCarryingResource] = useState(false);
  const [position3D] = useState(new Vector3(position[0], position[1], position[2]));
  const [velocity] = useState(new Vector3());
  const [targetPosition] = useState(new Vector3());
  const [resourceType, setResourceType] = useState<'food' | 'material'>('food');
  const [randomOffset] = useState(Math.random() * 10); // Random offset for varied movement
  const [explorationTarget, setExplorationTarget] = useState<Vector3 | null>(null);
  const [lastStateChange] = useState(Date.now());
  
  // Enhanced animation states
  const [legSpeed, setLegSpeed] = useState(12);
  const [bodyBobHeight, setBodyBobHeight] = useState(0);
  
  // AI behavior decision timer with more intelligent decisions
  useEffect(() => {
    const decideAction = () => {
      const now = Date.now();
      
      // Stay in current state if it hasn't been long enough
      if (now - lastStateChange < 1000 + Math.random() * 1000) {
        return;
      }
      
      // Chance to explore rather than just idle
      if (state === 'idle' && Math.random() < 0.4) {
        setState('exploring');
        
        // Set a random exploration target within a reasonable radius
        const radius = 5 + Math.random() * 15;
        const angle = Math.random() * Math.PI * 2;
        const explorationPoint = new Vector3(
          colonyPosition[0] + Math.cos(angle) * radius,
          0,
          colonyPosition[2] + Math.sin(angle) * radius
        );
        setExplorationTarget(explorationPoint);
        return;
      }
      
      if (state === 'idle' || state === 'exploring') {
        // Only find resources if player colony or level is high enough
        if (!isPlayerColony && Math.random() > 0.2) return;
        
        // Find closest resource that's not too far
        let closestResource: Resource | null = null;
        let closestDistance = Number.MAX_VALUE;
        
        resources.forEach(resource => {
          const resourcePos = new Vector3(
            resource.position[0], 
            resource.position[1], 
            resource.position[2]
          );
          const distance = position3D.distanceTo(resourcePos);
          
          // More intelligent resource selection - prefer closer resources
          // but occasionally go for farther ones too
          const effectiveDistance = distance / (1 + Math.random() * 0.5);
          
          if (effectiveDistance < closestDistance && distance < 25) {
            closestDistance = effectiveDistance;
            closestResource = resource;
          }
        });
        
        if (closestResource) {
          setTargetResource(closestResource);
          setState('hunting');
          setLegSpeed(16); // Faster legs when hunting
          const resource = closestResource as Resource;
          targetPosition.set(
            resource.position[0], 
            resource.position[1], 
            resource.position[2]
          );
        } else if (state !== 'exploring' && Math.random() < 0.3) {
          // Sometimes explore if no resources found
          setState('exploring');
          const radius = 8 + Math.random() * 12;
          const angle = Math.random() * Math.PI * 2;
          const explorationPoint = new Vector3(
            colonyPosition[0] + Math.cos(angle) * radius,
            0,
            colonyPosition[2] + Math.sin(angle) * radius
          );
          setExplorationTarget(explorationPoint);
        }
      }
    };
    
    const interval = setInterval(decideAction, 1500 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, [state, resources, position3D, isPlayerColony, targetPosition, colonyPosition]);
  
  useFrame((_, delta) => {
    if (!antRef.current) return;
    
    const time = Date.now() * 0.001;
    const offset = randomOffset + index * 0.5;
    
    // Different behavior based on the ant's state
    if (state === 'idle') {
      // More interesting wandering behavior
      const timeScale = 0.3;
      const wanderRadius = 2 + Math.sin(time * 0.2 + offset) * 0.8;
      const wanderAngle = time * 0.4 + offset;
      
      // Make a figure-8 pattern
      const x = Math.sin(wanderAngle) * wanderRadius;
      const z = Math.sin(wanderAngle * 2) * wanderRadius * 0.5;
      
      position3D.set(
        colonyPosition[0] + x,
        0,
        colonyPosition[2] + z
      );
      
      antRef.current.position.copy(position3D);
      
      // Smooth rotation to face direction of movement
      const targetRotation = Math.atan2(z - antRef.current.position.z, x - antRef.current.position.x) + Math.PI / 2;
      antRef.current.rotation.y = targetRotation;
      
      // Slower leg movement when idle
      setLegSpeed(6 + Math.sin(time * 2) * 2);
    } 
    else if (state === 'exploring') {
      if (explorationTarget) {
        const distance = position3D.distanceTo(explorationTarget);
        
        if (distance < 0.5) {
          // Reached exploration target, go back to idle
          setState('idle');
          setExplorationTarget(null);
        } else {
          // Move towards exploration target with some wandering
          const direction = new Vector3().subVectors(explorationTarget, position3D).normalize();
          
          // Add some randomness to make movement more natural
          const randomFactor = 0.1;
          direction.x += (Math.random() - 0.5) * randomFactor;
          direction.z += (Math.random() - 0.5) * randomFactor;
          direction.normalize();
          
          // Move with variable speed
          const moveSpeed = 1.5 + Math.sin(time * 3) * 0.2;
          velocity.copy(direction).multiplyScalar(delta * moveSpeed);
          position3D.add(velocity);
          
          // Rotation towards movement direction with smooth interpolation
          const targetRotation = Math.atan2(direction.z, direction.x) - Math.PI / 2;
          antRef.current.rotation.y += (targetRotation - antRef.current.rotation.y) * 0.1;
          
          // Body bob up and down while moving
          setBodyBobHeight(Math.sin(time * 15) * 0.03);
          antRef.current.position.y = position3D.y + bodyBobHeight;
          antRef.current.position.x = position3D.x;
          antRef.current.position.z = position3D.z;
        }
      }
    }
    else if (state === 'hunting' && targetResource) {
      // Move towards the target resource with more realistic movement
      const resourcePos = new Vector3(
        targetResource.position[0], 
        targetResource.position[1], 
        targetResource.position[2]
      );
      const distance = position3D.distanceTo(resourcePos);
      
      if (distance < 0.5) {
        // Reached the resource, collect it
        setCarryingResource(true);
        setResourceType(targetResource.type);
        collectResource(targetResource.id);
        setState('returning');
        setLegSpeed(20); // Even faster when carrying resources back
      } else {
        // Calculate direction to resource
        const direction = new Vector3().subVectors(resourcePos, position3D).normalize();
        
        // Add some randomness to path for more natural movement
        if (Math.random() < 0.05) {
          direction.x += (Math.random() - 0.5) * 0.1;
          direction.z += (Math.random() - 0.5) * 0.1;
          direction.normalize();
        }
        
        // Move towards the resource with excitement (faster near resource)
        const speedFactor = 2 - Math.min(1, distance / 10);
        velocity.copy(direction).multiplyScalar(delta * 2.5 * speedFactor);
        position3D.add(velocity);
        
        // Smoother rotation toward target
        const targetRotation = Math.atan2(direction.z, direction.x) - Math.PI / 2;
        antRef.current.rotation.y += (targetRotation - antRef.current.rotation.y) * 0.2;
        
        // Body bob faster when moving quickly
        setBodyBobHeight(Math.sin(time * 20) * 0.05);
      }
      
      antRef.current.position.set(position3D.x, position3D.y + bodyBobHeight, position3D.z);
    }
    else if (state === 'returning') {
      // Return to colony with more determination
      const colonyPos = new Vector3(
        colonyPosition[0],
        colonyPosition[1],
        colonyPosition[2]
      );
      const distance = position3D.distanceTo(colonyPos);
      
      if (distance < 0.5) {
        // Reached the colony, deposit resources
        setCarryingResource(false);
        setState('idle');
        setLegSpeed(8); // Return to normal speed
      } else {
        // Move directly to colony, minimal wandering when carrying resources
        const direction = new Vector3().subVectors(colonyPos, position3D).normalize();
        
        // Move faster when returning with resources
        velocity.copy(direction).multiplyScalar(delta * 3);
        position3D.add(velocity);
        
        // Quick rotation toward colony
        const targetRotation = Math.atan2(direction.z, direction.x) - Math.PI / 2;
        antRef.current.rotation.y += (targetRotation - antRef.current.rotation.y) * 0.3;
        
        // Determined movement with resource
        setBodyBobHeight(Math.sin(time * 24) * 0.05);
      }
      
      antRef.current.position.set(position3D.x, position3D.y + bodyBobHeight, position3D.z);
    }
    
    // Enhanced leg animation with varying speeds based on state
    if (antRef.current) {
      // Adaptive leg speed based on state and movement
      const walkSpeed = legSpeed * (state === 'idle' ? 1 : state === 'returning' ? 1.8 : 1.5);
      
      antRef.current.children.forEach((child, i) => {
        if (child.name.includes('leg')) {
          // More natural alternating leg movement with phase differences
          const phase = i % 2 === 0 ? 0 : Math.PI;
          const legIndex = parseInt(child.name.split('-')[2]);
          const legPhaseOffset = legIndex * Math.PI / 3; // Stagger legs
          
          // Dynamic leg swinging based on speed and state
          child.rotation.x = Math.sin(time * walkSpeed + legPhaseOffset + phase) * 0.4;
          
          // Add lateral leg movement for more realistic walking
          if (child.name.includes('left')) {
            child.rotation.z = Math.abs(Math.sin(time * walkSpeed + legPhaseOffset + phase)) * 0.15;
          } else {
            child.rotation.z = -Math.abs(Math.sin(time * walkSpeed + legPhaseOffset + phase)) * 0.15;
          }
        }
        
        // Animate antennae
        if (child.name.includes('antennae')) {
          child.children.forEach((antenna, index) => {
            // Antennae move independently and react to state
            const antennaSpeed = state === 'hunting' ? 12 : state === 'idle' ? 4 : 8;
            const antennaOffset = index * Math.PI;
            
            // Twitch more when hunting/excited
            antenna.rotation.x = Math.sin(time * antennaSpeed + antennaOffset) * 0.2;
            antenna.rotation.z = Math.cos(time * antennaSpeed * 0.7 + antennaOffset) * 0.15;
          });
        }
      });
    }
  });
  
  return (
    <group ref={antRef} position={position} name={`ant-${index}`}>
      {/* Ant body - enhanced with more realistic segments */}
      <group name="body" position={[0, bodyBobHeight, 0]}>
        {/* Head */}
        <mesh castShadow position={[0, 0.1, 0.15]} name="head">
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Thorax - slightly larger and more detailed */}
        <mesh castShadow position={[0, 0.15, 0]} name="thorax">
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Abdomen - even larger for better proportions */}
        <mesh castShadow position={[0, 0.15, -0.25]} name="abdomen">
          <sphereGeometry args={[0.15, 14, 12]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Neck connection between head and thorax */}
        <mesh castShadow position={[0, 0.13, 0.08]} rotation={[Math.PI/2, 0, 0]} name="neck">
          <cylinderGeometry args={[0.06, 0.09, 0.08, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        
        {/* Connection between thorax and abdomen */}
        <mesh castShadow position={[0, 0.15, -0.12]} rotation={[Math.PI/2, 0, 0]} name="waist">
          <cylinderGeometry args={[0.08, 0.06, 0.1, 8]} />
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
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh castShadow position={[0.22, -0.1, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
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
              <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh castShadow position={[-0.22, -0.1, 0]}>
              <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        ))}
        
        {/* Antennae */}
        <group position={[0, 0.15, 0.15]} name="antennae">
          <mesh castShadow position={[0.05, 0.05, 0.08]} rotation={[Math.PI / 4, 0, Math.PI / 8]} name="antenna-left">
            <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          
          <mesh castShadow position={[-0.05, 0.05, 0.08]} rotation={[Math.PI / 4, 0, -Math.PI / 8]} name="antenna-right">
            <cylinderGeometry args={[0.01, 0.01, 0.2, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
        
        {/* Mandibles for added detail */}
        <group position={[0, 0.07, 0.22]} name="mandibles">
          <mesh castShadow position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
            <boxGeometry args={[0.08, 0.02, 0.02]} />
            <meshStandardMaterial color={color} />
          </mesh>
          
          <mesh castShadow position={[-0.04, 0, 0]} rotation={[0, 0, -Math.PI / 6]}>
            <boxGeometry args={[0.08, 0.02, 0.02]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
        
        {/* Resource being carried (if any) - more visually appealing */}
        {carryingResource && (
          <mesh 
            position={[0, 0.35, 0]} 
            castShadow
            name="carried-resource"
          >
            {resourceType === 'food' ? (
              // Food resource (more organic shapes)
              <>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color="#8BC34A" />
              </>
            ) : (
              // Material resource (more angular)
              <>
                <boxGeometry args={[0.08, 0.08, 0.08]} />
                <meshStandardMaterial color="#795548" />
              </>
            )}
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