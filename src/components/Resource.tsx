import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { useStore } from '../store/gameStore';
import { Vector3, Group } from 'three';

interface ResourceProps {
  position: [number, number, number];
  type: 'food' | 'material';
  value: number;
}

const Resource = ({ position, type, value }: ResourceProps) => {
  const resourceRef = useRef<Group>(null);
  const [isCollected, setIsCollected] = useState(false);
  
  // Access player actions
  const collectFood = useStore(state => state.collectFood);
  const playerPosition = useStore(state => state.colonyPosition);
  
  // Create a physics body for the resource
  const [ref, api] = useSphere(() => ({
    args: [0.5],
    position,
    type: 'Static',
    collisionResponse: true,
  }));
  
  // Check if player is near the resource
  useFrame(() => {
    if (isCollected || !playerPosition) return;
    
    // Calculate distance to player
    const distanceToPlayer = new Vector3(
      position[0] - playerPosition[0],
      position[1] - playerPosition[1],
      position[2] - playerPosition[2]
    ).length();
    
    // Check if player is close enough to collect
    if (distanceToPlayer < 3) {
      // Check if collect key is pressed (handled in Game.tsx)
      const keyState = useStore.getState();
      
      // For demonstration, we'll simply check if player presses 'E'
      if (keyState && document.addEventListener) {
        document.addEventListener('keydown', (e) => {
          if (e.code === 'KeyE' && !isCollected && distanceToPlayer < 3) {
            collectResource();
          }
        }, { once: true });
      }
      
      // Visual indication that resource is collectable
      if (resourceRef.current) {
        resourceRef.current.scale.setScalar(1.2 + Math.sin(Date.now() * 0.01) * 0.1);
      }
    } else {
      // Reset scale when player moves away
      if (resourceRef.current) {
        resourceRef.current.scale.setScalar(1);
      }
    }
  });
  
  // Collection animation
  const collectResource = () => {
    if (isCollected) return;
    
    setIsCollected(true);
    
    // Add resource to player inventory
    if (type === 'food') {
      collectFood(value);
    }
    
    // Animate the resource being collected
    if (resourceRef.current) {
      resourceRef.current.scale.setScalar(0.1);
    }
    
    // Remove the resource after animation
    setTimeout(() => {
      if (ref.current) {
        ref.current.visible = false;
        api.position.set(0, -100, 0); // Move out of sight
      }
    }, 500);
  };
  
  // Resource appearance based on type
  const resourceColor = type === 'food' ? '#77ff77' : '#7777ff';
  const resourceSize = value * 0.05 + 0.2; // Size based on value
  
  return (
    <group ref={ref as any}>
      <group 
        ref={resourceRef}
        position={[0, 0.5, 0]} 
        rotation={[0, Math.random() * Math.PI * 2, 0]}
      >
        {type === 'food' ? (
          // Food resource (leaf-like)
          <mesh castShadow>
            <coneGeometry args={[resourceSize, resourceSize * 2, 4]} />
            <meshStandardMaterial color={resourceColor} />
          </mesh>
        ) : (
          // Building material resource (rock-like)
          <mesh castShadow>
            <icosahedronGeometry args={[resourceSize, 0]} />
            <meshStandardMaterial color={resourceColor} />
          </mesh>
        )}
      </group>
    </group>
  );
};

export default Resource; 