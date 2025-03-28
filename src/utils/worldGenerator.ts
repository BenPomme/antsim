import { v4 as uuidv4 } from 'uuid';
import { Colony, ColonyRelation } from '../store/gameStore';

// Define resource type
export interface Resource {
  id: string;
  position: [number, number, number];
  type: 'food' | 'material';
  value: number;
}

// Define enemy ant type
export interface EnemyAnt {
  id: string;
  position: [number, number, number];
  strength: number;
  colonyId: string;
}

// World generation result
export interface WorldGeneration {
  colonies: Colony[];
  resources: Resource[];
  enemyAnts: EnemyAnt[];
}

// Helper to get random position within world bounds
const getRandomPosition = (worldSize: number, centerDistance = 0): [number, number, number] => {
  let x, z;
  const distanceFromCenter = centerDistance + Math.random() * (worldSize / 2 - centerDistance);
  const angle = Math.random() * Math.PI * 2;
  
  x = Math.cos(angle) * distanceFromCenter;
  z = Math.sin(angle) * distanceFromCenter;
  
  return [x, 0, z];
};

// Generate random colony
const generateColony = (worldSize: number, centerDistance: number): Colony => {
  const position = getRandomPosition(worldSize, centerDistance);
  const size = Math.floor(Math.random() * 50) + 10;
  const level = Math.floor(Math.random() * 3) + 1;
  
  // Determine relation - more enemies at the edge of the world
  const distanceRatio = Math.sqrt(position[0] * position[0] + position[2] * position[2]) / (worldSize / 2);
  const relationChance = Math.random();
  
  let relation: ColonyRelation;
  if (relationChance < 0.3) {
    relation = 'neutral';
  } else if (relationChance < 0.6 - distanceRatio * 0.3) {
    relation = 'ally';
  } else {
    relation = 'enemy';
  }
  
  return {
    id: uuidv4(),
    position,
    size,
    level,
    relation,
    resources: Math.floor(Math.random() * 100),
  };
};

// Generate resources around a position
const generateResourcesAroundPosition = (
  position: [number, number, number],
  count: number,
  radius: number
): Resource[] => {
  const resources: Resource[] = [];
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    
    const resourcePosition: [number, number, number] = [
      position[0] + Math.cos(angle) * distance,
      0,
      position[2] + Math.sin(angle) * distance
    ];
    
    const type = Math.random() > 0.7 ? 'material' : 'food';
    const value = Math.floor(Math.random() * 10) + 5;
    
    resources.push({
      id: uuidv4(),
      position: resourcePosition,
      type,
      value
    });
  }
  
  return resources;
};

// Generate enemy ants for enemy colonies
const generateEnemyAnts = (colonies: Colony[]): EnemyAnt[] => {
  const enemyAnts: EnemyAnt[] = [];
  
  colonies.forEach(colony => {
    if (colony.relation === 'enemy') {
      const antCount = Math.floor(Math.random() * (colony.size / 10)) + 1;
      
      for (let i = 0; i < antCount; i++) {
        const position: [number, number, number] = [
          colony.position[0] + (Math.random() * 10 - 5),
          colony.position[1],
          colony.position[2] + (Math.random() * 10 - 5)
        ];
        
        enemyAnts.push({
          id: uuidv4(),
          position,
          strength: Math.floor(Math.random() * 3) + colony.level,
          colonyId: colony.id
        });
      }
    }
  });
  
  return enemyAnts;
};

// Generate the entire world
export const generateWorld = (worldSize: number): WorldGeneration => {
  const colonyCount = 20; // Total number of other colonies
  const colonies: Colony[] = [];
  let resources: Resource[] = [];
  
  // Generate colonies with increasing distance from center
  for (let i = 0; i < colonyCount; i++) {
    // Distance from center increases with each colony
    const centerDistance = (i / colonyCount) * (worldSize / 2 - 50);
    const colony = generateColony(worldSize, centerDistance);
    colonies.push(colony);
    
    // Generate resources around each colony
    const resourceCount = Math.floor(Math.random() * 20) + 5;
    const colonyResources = generateResourcesAroundPosition(
      colony.position,
      resourceCount,
      30
    );
    resources = [...resources, ...colonyResources];
  }
  
  // Generate additional random resources across the world
  const randomResourceCount = 100;
  for (let i = 0; i < randomResourceCount; i++) {
    const position = getRandomPosition(worldSize);
    const type = Math.random() > 0.6 ? 'material' : 'food';
    const value = Math.floor(Math.random() * 10) + 1;
    
    resources.push({
      id: uuidv4(),
      position,
      type,
      value
    });
  }
  
  // Generate enemy ants
  const enemyAnts = generateEnemyAnts(colonies);
  
  return {
    colonies,
    resources,
    enemyAnts
  };
}; 