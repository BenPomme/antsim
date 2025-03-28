import { useEffect, useState } from 'react';
import { useStore } from '../store/gameStore';
import { Resource, Colony } from '../store/gameStore';
import { useFrame } from '@react-three/fiber';
import Player from './Player';
import ResourceComponent from './Resource';
import AntColony from './AntColony';
import Ground from './Ground';
import { Vector3 } from 'three';

// Environmental props components
const Grass = ({ position }: { position: [number, number, number] }) => {
  return (
    <mesh position={position} rotation={[0, Math.random() * Math.PI * 2, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.1, 0.5, 3]} />
      <meshStandardMaterial color="#4C9900" />
    </mesh>
  );
};

const Rock = ({ position, size = 1 }: { position: [number, number, number], size?: number }) => {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, size * 0.2, 0]}>
        <sphereGeometry args={[size * 0.3, 6, 6]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>
      <mesh castShadow receiveShadow position={[size * 0.2, 0, size * 0.1]}>
        <sphereGeometry args={[size * 0.25, 6, 6]} />
        <meshStandardMaterial color="#777777" roughness={0.9} />
      </mesh>
      <mesh castShadow receiveShadow position={[-size * 0.15, 0, -size * 0.15]}>
        <sphereGeometry args={[size * 0.28, 6, 6]} />
        <meshStandardMaterial color="#666666" roughness={0.9} />
      </mesh>
    </group>
  );
};

export default function Game() {
  const { 
    increaseColonySize, 
    colonySize, 
    addResource, 
    removeResource, 
    resources,
    collectResource,
    addEnemyColony,
    updateColony,
    colonies
  } = useStore();
  
  // Keep track of game elements
  const [gameResources, setGameResources] = useState<Resource[]>([]);
  const [enemyColonies, setEnemyColonies] = useState<Colony[]>([]);
  const [environmentProps, setEnvironmentProps] = useState<{
    rocks: [number, number, number][];
    grass: [number, number, number][];
  }>({ rocks: [], grass: [] });
  
  useEffect(() => {
    // Generate environmental props
    const rocks: [number, number, number][] = [];
    const grass: [number, number, number][] = [];
    
    // Generate some rocks
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 40 + 10;
      rocks.push([
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      ]);
    }
    
    // Generate grass patches
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 50;
      grass.push([
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      ]);
    }
    
    setEnvironmentProps({ rocks, grass });
    
    // Generate starting resources
    for (let i = 0; i < 30; i++) {
      generateNewResource();
    }

    // Add some ants to start
    for (let i = 0; i < 5; i++) {
      increaseColonySize();
    }
    
    // Generate enemy colonies
    generateEnemyColonies();

    // Spawn new resources and enemy ants periodically
    const spawnInterval = setInterval(() => {
      // Spawn new resources
      if (Math.random() < 0.7) {
        generateNewResource();
      }
      
      // Sometimes spawn a new enemy colony
      if (Math.random() < 0.05) {
        generateEnemyColonies(1);
      }
      
      // Update enemy colonies (make them grow)
      if (Math.random() < 0.3) {
        updateRandomEnemyColony();
      }
    }, 5000);

    return () => clearInterval(spawnInterval);
  }, [increaseColonySize]);

  // Generate new resources
  const generateNewResource = () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 30 + 5;
    const position: [number, number, number] = [
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    ];
    
    const resource: Resource = {
      id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position,
      type: Math.random() > 0.5 ? 'food' : 'material',
      value: Math.floor(Math.random() * 10) + 1
    };
    
    addResource(resource);
  };
  
  // Generate enemy colonies
  const generateEnemyColonies = (count = 2) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 20 + 20; // Keep enemy colonies at a distance
      const position: [number, number, number] = [
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      ];
      
      const colony: Colony = {
        id: `enemy-colony-${Date.now()}-${i}`,
        position,
        size: Math.floor(Math.random() * 5) + 3,
        level: Math.floor(Math.random() * 2) + 1,
        relation: 'enemy'
      };
      
      addEnemyColony(colony);
    }
  };
  
  // Randomly make an enemy colony stronger
  const updateRandomEnemyColony = () => {
    const enemyColonies = colonies.filter(c => c.relation === 'enemy');
    if (enemyColonies.length > 0) {
      const randomColony = enemyColonies[Math.floor(Math.random() * enemyColonies.length)];
      
      // Only grow if not too large already
      if (randomColony.size < 15) {
        updateColony(randomColony.id, {
          size: randomColony.size + 1
        });
      }
    }
  };
  
  // Check for resources that player ants have collected
  useEffect(() => {
    const handleCollectedResources = () => {
      resources.forEach(resource => {
        const resourcePos = new Vector3(...resource.position);
        const playerColonyPos = new Vector3(0, 0, 0); // Player colony is at origin
        
        // If a resource is at the colony, consider it collected
        if (resourcePos.distanceTo(playerColonyPos) < 1) {
          collectResource(resource.id);
        }
      });
    };
    
    const interval = setInterval(handleCollectedResources, 1000);
    return () => clearInterval(interval);
  }, [resources, collectResource]);

  return (
    <>
      <Ground />
      <Player />
      
      {/* Resources */}
      {resources.map(resource => (
        <ResourceComponent key={resource.id} resource={resource} />
      ))}
      
      {/* Player colony */}
      <AntColony colony={{
        id: 'player-colony',
        position: [0, 0, 0],
        size: colonySize,
        level: 1,
        relation: 'neutral'
      }} isPlayerColony />
      
      {/* Enemy colonies */}
      {colonies.filter(c => c.relation === 'enemy').map(colony => (
        <AntColony key={colony.id} colony={colony} />
      ))}
      
      {/* Environment props */}
      {environmentProps.rocks.map((position, i) => (
        <Rock key={`rock-${i}`} position={position} size={0.5 + Math.random() * 1.5} />
      ))}
      
      {environmentProps.grass.map((position, i) => (
        <Grass key={`grass-${i}`} position={position} />
      ))}
    </>
  );
} 