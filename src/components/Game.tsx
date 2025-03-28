import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/gameStore';
import { Resource, Colony } from '../store/gameStore';
import Player from './Player';
import ResourceComponent from './Resource';
import AntColony from './AntColony';
import Ground from './Ground';
import CameraController from './CameraController';
import { Vector3 } from 'three';
import { useBox } from '@react-three/cannon';
import EnemyAnt from './EnemyAnt';

// Environmental props components with physics
const Grass = ({ position }: { position: [number, number, number] }) => {
  return (
    <mesh position={position} rotation={[0, Math.random() * Math.PI * 2, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.1, 0.5, 3]} />
      <meshStandardMaterial color="#4C9900" />
    </mesh>
  );
};

const Rock = ({ position, size = 1 }: { position: [number, number, number], size?: number }) => {
  // Add a physics collider for the rock
  const [ref] = useBox(() => ({
    args: [size * 0.8, size * 0.5, size * 0.8], // Slightly smaller than visual size
    position,
    type: 'Static',
    collisionFilterGroup: 1, // Environment group
  }));

  return (
    <group ref={ref as any} position={position}>
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

// Keep a counter for generating stable IDs
let enemyAntIdCounter = 0;

export default function Game() {
  const { 
    increaseColonySize, 
    colonySize, 
    addResource, 
    resources,
    collectResource,
    addEnemyColony,
    updateColony,
    colonies,
    addEnemyAnt,
    enemyAnts,
    playerPosition,
    removeEnemyAnt
  } = useStore();
  
  // Track elapsed time for game events
  const gameTime = useRef(0);
  const lastEnemySpawn = useRef(0);
  
  // Keep track of game elements
  const [environmentProps, setEnvironmentProps] = useState<{
    rocks: [number, number, number][];
    grass: [number, number, number][];
  }>({ rocks: [], grass: [] });
  
  // Generate new resources with collision avoidance
  const generateNewResource = () => {
    // Create a valid position away from obstacles
    let validPosition = false;
    let position: [number, number, number] = [0, 0, 0];
    let attempts = 0;
    
    while (!validPosition && attempts < 20) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 30 + 10;
      position = [
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      ];
      
      // Check distance from rocks to avoid overlap
      validPosition = true;
      for (const rock of environmentProps.rocks) {
        const dx = rock[0] - position[0];
        const dz = rock[2] - position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 2) { // Minimum distance from rocks
          validPosition = false;
          break;
        }
      }
      
      // Also check distance from other resources
      for (const resource of resources) {
        const dx = resource.position[0] - position[0];
        const dz = resource.position[2] - position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 3) { // Minimum distance between resources
          validPosition = false;
          break;
        }
      }
    }
    
    // Only create resource if valid position was found
    if (validPosition) {
      const resource: Resource = {
        id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position,
        type: Math.random() > 0.5 ? 'food' : 'material',
        value: Math.floor(Math.random() * 10) + 1
      };
      
      addResource(resource);
    }
  };
  
  // Helper to spawn enemy ants with stable IDs
  const spawnEnemyAnt = (position: [number, number, number], colonyId: string, strength: number) => {
    // Use a counter for ID generation instead of timestamp
    const antId = `enemy-ant-${colonyId}-${enemyAntIdCounter++}`;
    
    // Check if this ant ID already exists to prevent duplicate additions
    const existingAnt = enemyAnts.find(ant => ant.id === antId);
    if (existingAnt) return;
    
    // Add enemy ant directly to the store
    addEnemyAnt({
      id: antId,
      position,
      colonyId,
      strength,
      health: strength * 20,
      state: 'hunting', // Start in hunting mode to target player
      target: [...playerPosition] as [number, number, number],
      lastDecision: Date.now(),
      learningRate: 0.1 + Math.random() * 0.2,
      successfulAttacks: 0
    });
  };
  
  // Handle enemy waves for graduated difficulty
  const handleEnemyWaves = () => {
    const currentTime = gameTime.current;
    const timeSinceLastSpawn = currentTime - lastEnemySpawn.current;
    
    // Spawn waves every 30-60 seconds depending on game progress
    // Increased minimum time to prevent overlapping waves
    if (timeSinceLastSpawn > 60 + Math.random() * 30) {
      // Calculate wave strength based on game progress
      const gameProgress = Math.min(currentTime / 300, 1); // Cap at 5 minutes for max difficulty
      const waveSize = Math.floor(1 + gameProgress * 5); // Reduce max wave size to 1-6 ants per wave
      const enemyStrength = Math.floor(1 + gameProgress * 2); // 1-3 strength
      
      // Find enemy colonies to spawn from
      const enemyColonies = colonies.filter(c => c.relation === 'enemy');
      
      if (enemyColonies.length > 0) {
        // Pick a random colony to send ants from
        const spawnColony = enemyColonies[Math.floor(Math.random() * enemyColonies.length)];
        
        // Spawn a wave of ants with delay between each spawn
        for (let i = 0; i < waveSize; i++) {
          // Spawn with slight positioning variation
          const offset = 2;
          const position: [number, number, number] = [
            spawnColony.position[0] + (Math.random() - 0.5) * offset,
            spawnColony.position[1],
            spawnColony.position[2] + (Math.random() - 0.5) * offset
          ];
          
          // Add enemy ant with targeting player - staggered spawning
          setTimeout(() => {
            spawnEnemyAnt(position, spawnColony.id, enemyStrength);
          }, i * 500); // Delay each spawn by 500ms
        }
        
        lastEnemySpawn.current = currentTime;
      }
    }
  };
  
  // Generate enemy colonies with positioning logic
  const generateEnemyColonies = (count = 2) => {
    // Maximum total colonies to prevent overcrowding
    const maxTotalColonies = 5;
    const existingEnemyColonies = colonies.filter(c => c.relation === 'enemy').length;
    
    // Only create new colonies if under the limit
    const coloniesToCreate = Math.min(count, maxTotalColonies - existingEnemyColonies);
    if (coloniesToCreate <= 0) return;
    
    for (let i = 0; i < coloniesToCreate; i++) {
      // Position colonies in a valid location
      let validPosition = false;
      let position: [number, number, number] = [0, 0, 0];
      let attempts = 0;
      
      // Try to find a valid position, but limit attempts to prevent infinite loops
      while (!validPosition && attempts < 20) {
        attempts++;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 20 + 25; // Keep enemy colonies at a distance
        position = [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ];
        
        // Check distance from other colonies
        validPosition = true;
        for (const colony of colonies) {
          const dx = colony.position[0] - position[0];
          const dz = colony.position[2] - position[2];
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < 15) { // Minimum distance between colonies
            validPosition = false;
            break;
          }
        }
        
        // Check distance from rocks
        for (const rock of environmentProps.rocks) {
          const dx = rock[0] - position[0];
          const dz = rock[2] - position[2];
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < 5) { // Minimum distance from rocks
            validPosition = false;
            break;
          }
        }
      }
      
      // Only proceed if we found a valid position
      if (validPosition) {
        const colonyId = `enemy-colony-${Date.now()}-${i}`;
        
        const colony: Colony = {
          id: colonyId,
          position,
          size: Math.floor(Math.random() * 5) + 3,
          level: Math.floor(Math.random() * 2) + 1,
          relation: 'enemy'
        };
        
        addEnemyColony(colony);
        
        // Spawn a few initial enemy ants around this colony - but fewer to start
        const initialAnts = Math.floor(Math.random() * 2) + 1; // 1-2 ants
        for (let j = 0; j < initialAnts; j++) {
          const offset = 2;
          const antPosition: [number, number, number] = [
            position[0] + (Math.random() - 0.5) * offset,
            position[1],
            position[2] + (Math.random() - 0.5) * offset
          ];
          
          // Stagger spawning to prevent state update collisions
          setTimeout(() => {
            spawnEnemyAnt(antPosition, colonyId, 1);
          }, j * 200); // 200ms delay between spawns
        }
      }
    }
  };
  
  // Main game initialization useEffect
  useEffect(() => {
    // Generate environmental props - avoid placing objects at player start
    const rocks: [number, number, number][] = [];
    const grass: [number, number, number][] = [];
    
    // Generate some rocks with collision - keep away from player start
    for (let i = 0; i < 30; i++) {
      let validPosition = false;
      let position: [number, number, number] = [0, 0, 0];
      
      // Keep trying until we find a valid position
      while (!validPosition) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 40 + 10; // Keep away from center
        position = [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ];
        
        // Check distance from other rocks to avoid overlapping
        validPosition = true;
        for (const rock of rocks) {
          const dx = rock[0] - position[0];
          const dz = rock[2] - position[2];
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < 3) { // Minimum distance between rocks
            validPosition = false;
            break;
          }
        }
      }
      
      rocks.push(position);
    }
    
    // Generate grass patches - these don't need collision
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
    
    // Generate starting resources in valid locations
    for (let i = 0; i < 30; i++) {
      generateNewResource();
    }

    // Add some ants to start
    for (let i = 0; i < 5; i++) {
      increaseColonySize();
    }
    
    // Generate enemy colonies after a delay to ensure store is ready
    setTimeout(() => {
      generateEnemyColonies(2);
    }, 1000);

    // Main game loop for spawning and updating - use slower interval
    const gameLoopInterval = setInterval(() => {
      gameTime.current += 0.5;
      
      // Spawn new resources occasionally
      if (Math.random() < 0.3) {
        generateNewResource();
      }
      
      // Enemy waves system
      handleEnemyWaves();
      
      // Sometimes spawn a new enemy colony - less frequently
      if (Math.random() < 0.02) {
        generateEnemyColonies(1);
      }
      
      // Update enemy colonies (make them grow) - less frequently
      if (Math.random() < 0.1) {
        updateRandomEnemyColony();
      }
    }, 10000); // Slower interval: 10 seconds

    return () => clearInterval(gameLoopInterval);
  }, [increaseColonySize, addResource, addEnemyColony, updateColony, addEnemyAnt]);

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
        
        // Chance to spawn a new enemy ant when colony grows
        if (Math.random() < 0.3) {
          const offset = 2;
          const position: [number, number, number] = [
            randomColony.position[0] + (Math.random() - 0.5) * offset,
            randomColony.position[1],
            randomColony.position[2] + (Math.random() - 0.5) * offset
          ];
          
          spawnEnemyAnt(position, randomColony.id, Math.ceil(randomColony.level / 2));
        }
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
      <CameraController distance={8} height={3} smoothing={0.08} lookAtOffset={0.8} />
      
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
      
      {/* Enemy ants - pass the ID from the store data to the component */}
      {enemyAnts.map(enemyAnt => (
        <EnemyAnt 
          key={enemyAnt.id}
          id={enemyAnt.id}
          position={enemyAnt.position}
          colonyId={enemyAnt.colonyId}
          strength={enemyAnt.strength}
        />
      ))}
      
      {/* Environment props */}
      {environmentProps.rocks.map((position, i) => (
        <Rock key={`rock-${i}`} position={position} size={0.5 + Math.random() * 1.5} />
      ))}
      
      {environmentProps.grass.map((position, i) => (
        <Grass key={`grass-${i}`} position={position} />
      ))}
      
      {/* Add invisible walls around the world to prevent falling off */}
      <group>
        {/* North wall */}
        <mesh position={[0, 5, -100]} receiveShadow>
          <boxGeometry args={[200, 10, 1]} />
          <meshStandardMaterial color="#000000" transparent opacity={0} />
        </mesh>
        
        {/* South wall */}
        <mesh position={[0, 5, 100]} receiveShadow>
          <boxGeometry args={[200, 10, 1]} />
          <meshStandardMaterial color="#000000" transparent opacity={0} />
        </mesh>
        
        {/* East wall */}
        <mesh position={[100, 5, 0]} receiveShadow>
          <boxGeometry args={[1, 10, 200]} />
          <meshStandardMaterial color="#000000" transparent opacity={0} />
        </mesh>
        
        {/* West wall */}
        <mesh position={[-100, 5, 0]} receiveShadow>
          <boxGeometry args={[1, 10, 200]} />
          <meshStandardMaterial color="#000000" transparent opacity={0} />
        </mesh>
      </group>
    </>
  );
} 