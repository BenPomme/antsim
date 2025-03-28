import { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/gameStore';
import { generateWorld } from '../utils/worldGenerator';
import Player from './Player';
import Ground from './Ground';
import AntColony from './AntColony';
import Resource from './Resource';
import EnemyAnt from './EnemyAnt';
import { Resource as ResourceType } from '../utils/worldGenerator';

const Game = () => {
  // Access game state
  const worldSize = useStore(state => state.worldSize);
  const addColony = useStore(state => state.addColony);
  const health = useStore(state => state.health);
  const enemiesDefeated = useStore(state => state.enemiesDefeated);
  const upgradeColony = useStore(state => state.upgradeColony);
  const increaseColonySize = useStore(state => state.increaseColonySize);
  const addResource = useStore(state => state.addResource);
  const addEnemyAnt = useStore(state => state.addEnemyAnt);
  const switchActiveAnt = useStore(state => state.switchActiveAnt);
  const playerAnts = useStore(state => state.playerAnts);
  
  // Local state for generated world entities
  const [resources, setResources] = useState<ResourceType[]>([]);
  const [enemyAnts, setEnemyAnts] = useState<any[]>([]);
  
  // Game over state
  const [gameOver, setGameOver] = useState(false);
  
  // Track key states for colony actions
  const keyStates = useRef({
    KeyU: false, // Upgrade colony
    KeyC: false, // Add new ant
  });
  
  // Handle keyboard input for colony management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keyStates.current[e.code as keyof typeof keyStates.current] = true;
      
      // Colony management actions
      if (e.code === 'KeyU') {
        // Upgrade colony if level requirement is met
        if (enemiesDefeated >= 3) {
          upgradeColony();
        }
      } else if (e.code === 'KeyC') {
        // Add new ant to player colony
        increaseColonySize(1);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keyStates.current[e.code as keyof typeof keyStates.current] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [upgradeColony, increaseColonySize, enemiesDefeated]);
  
  // Generate the world when the game starts
  useEffect(() => {
    // Create player colony at a fixed position
    const playerColony = {
      id: 'player-colony',
      position: [0, 0, 0] as [number, number, number],
      size: 10,
      level: 1,
      relation: 'ally' as const,
      resources: 50
    };
    
    // Generate the world
    const { colonies, resources } = generateWorld(worldSize);
    
    // Add all colonies to the store
    addColony(playerColony);
    colonies.forEach(colony => addColony(colony));
    
    // Add resources to the store
    resources.forEach(resource => {
      addResource(resource);
    });
    
    // Set resources for rendering
    setResources(resources);
    
    // Generate enemy ants around enemy colonies
    const generatedEnemyAnts: any[] = [];
    
    colonies.filter(colony => colony.relation === 'enemy').forEach(colony => {
      // Number of enemy ants based on colony size and level
      const antCount = Math.ceil((colony.size / 5) * colony.level);
      
      for (let i = 0; i < antCount; i++) {
        // Generate position around colony
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 5 + 3;
        
        const antPos: [number, number, number] = [
          colony.position[0] + Math.cos(angle) * distance,
          colony.position[1],
          colony.position[2] + Math.sin(angle) * distance
        ];
        
        // Create enemy ant with increasing difficulty
        const strength = Math.ceil(Math.random() * 2) + colony.level;
        
        generatedEnemyAnts.push({
          position: antPos,
          colonyId: colony.id,
          strength
        });
      }
    });
    
    setEnemyAnts(generatedEnemyAnts);
    
    // Add basic resources near the colony to start
    const startingResources: ResourceType[] = [];
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 15 + 5;
      
      const resource = {
        id: `starting-resource-${i}`,
        position: [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ] as [number, number, number],
        type: 'food',
        value: Math.floor(Math.random() * 5) + 5
      };
      
      startingResources.push(resource);
      addResource(resource);
    }
    
    setResources(prev => [...prev, ...startingResources]);
    
    // Spawn new resources and enemy ants periodically
    const spawnInterval = setInterval(() => {
      // Spawn new resources
      if (Math.random() < 0.7) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * worldSize * 0.6;
        
        const newResource = {
          id: `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          position: [
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
          ] as [number, number, number],
          type: Math.random() < 0.8 ? 'food' : 'material',
          value: Math.floor(Math.random() * 10) + 5
        };
        
        addResource(newResource);
        setResources(prev => [...prev, newResource]);
      }
      
      // Spawn new enemy ants based on difficulty
      if (Math.random() < 0.3) {
        // Find random enemy colony
        const enemyColonies = useStore.getState().colonies.filter(c => c.relation === 'enemy');
        
        if (enemyColonies.length > 0) {
          const randomColony = enemyColonies[Math.floor(Math.random() * enemyColonies.length)];
          
          // Generate position around colony
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 5 + 3;
          
          const antPos: [number, number, number] = [
            randomColony.position[0] + Math.cos(angle) * distance,
            randomColony.position[1],
            randomColony.position[2] + Math.sin(angle) * distance
          ];
          
          // Create enemy ant with increasing difficulty based on time passed
          const gameTimeBonus = Math.floor(Date.now() / 60000) % 10; // Increase every minute
          const strength = Math.ceil(Math.random() * 2) + randomColony.level + gameTimeBonus / 3;
          
          const newAnt = {
            position: antPos,
            colonyId: randomColony.id,
            strength: Math.min(10, strength) // Cap strength at 10
          };
          
          setEnemyAnts(prev => [...prev, newAnt]);
        }
      }
    }, 10000); // Every 10 seconds
    
    return () => clearInterval(spawnInterval);
  }, [worldSize, addColony, addResource, addEnemyAnt]);
  
  // Check for game over
  useEffect(() => {
    if (health <= 0 && !gameOver) {
      setGameOver(true);
    }
  }, [health, gameOver]);
  
  // Get colonies from store
  const colonies = useStore(state => state.colonies);
  const storeResources = useStore(state => state.resources);
  
  // Find player colony
  const playerColony = colonies.find(colony => colony.id === 'player-colony');
  
  return (
    <>
      {/* Game environment */}
      <Ground />
      <Player />
      
      {/* World entities */}
      {playerColony && (
        <AntColony colony={playerColony} isPlayerColony={true} />
      )}
      
      {colonies.filter(colony => colony.id !== 'player-colony').map(colony => (
        <AntColony key={colony.id} colony={colony} />
      ))}
      
      {storeResources.map(resource => (
        <Resource 
          key={resource.id}
          position={resource.position}
          type={resource.type}
          value={resource.value}
        />
      ))}
      
      {enemyAnts.map((ant, index) => (
        <EnemyAnt 
          key={`enemy-ant-${index}`}
          position={ant.position}
          strength={ant.strength}
          colonyId={ant.colonyId}
        />
      ))}
      
      {/* Display all player's ants except the active one (which is controlled by the Player component) */}
      {playerAnts.filter(ant => !ant.active).map(ant => (
        <mesh 
          key={ant.id}
          position={ant.position}
          onClick={() => switchActiveAnt(playerAnts.findIndex(a => a.id === ant.id))}
        >
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#663300" transparent opacity={0.7} />
        </mesh>
      ))}
      
      {/* Game over overlay */}
      {gameOver && (
        <mesh position={[0, 2, -5]}>
          <planeGeometry args={[10, 5]} />
          <meshBasicMaterial color="black" opacity={0.8} transparent />
        </mesh>
      )}
    </>
  );
};

export default Game; 