import { create } from 'zustand';

// Colony relation types
export type ColonyRelation = 'ally' | 'enemy' | 'neutral';

// Colony definition
export interface Colony {
  id: string;
  position: [number, number, number];
  size: number;
  level: number;
  relation: ColonyRelation;
}

// Resource definition
export interface Resource {
  id: string;
  position: [number, number, number];
  type: 'food' | 'material';
  value: number;
}

// Enemy ant definition
export interface EnemyAnt {
  id: string;
  position: [number, number, number];
  colonyId: string;
  strength: number;
  health: number;
  target?: [number, number, number];
  state: 'patrolling' | 'hunting' | 'returning' | 'attacking';
  lastDecision: number; // timestamp for AI decision making
  learningRate: number; // how quickly the ant learns from experience
  successfulAttacks: number; // track successful attacks for learning
}

// Player controlled ant definition
export interface PlayerAnt {
  id: string;
  position: [number, number, number];
  active: boolean; // is this the currently controlled ant
  health: number;
  carrying?: Resource; // what resource the ant is carrying
}

// Game state interface
interface GameState {
  // World properties
  worldSize: number;
  
  // Player properties
  playerPosition: [number, number, number];
  playerRotation: number; // New property for player rotation
  health: number;
  food: number;
  materials: number;
  playerAnts: PlayerAnt[];
  activeAntIndex: number;
  
  // Colony properties
  colonies: Colony[];
  
  // World entities
  resources: Resource[];
  enemyAnts: EnemyAnt[];
  
  // Game progress
  enemiesDefeated: number;
  colonyLevel: number;
  colonySize: number;
  
  // UI state
  showMessage: string;
  messageTimeout: number;
  
  // Methods
  moveColony: (position: [number, number, number]) => void;
  addColony: (colony: Colony) => void;
  removeColony: (id: string) => void;
  updateColony: (id: string, updates: Partial<Colony>) => void;
  addEnemyColony: (colony: Colony) => void;
  
  upgradeColony: () => void;
  increaseColonySize: () => void;
  
  updatePlayerPosition: (position: [number, number, number]) => void;
  updatePlayerRotation: (rotation: number) => void; // New method
  switchActiveAnt: (index: number) => void;
  addPlayerAnt: () => void;
  
  collectResource: (id: string) => void;
  damagePlayer: (amount: number) => void;
  defeatEnemy: () => void;
  
  addEnemyAnt: (ant: EnemyAnt) => void;
  removeEnemyAnt: (id: string) => void;
  updateEnemyAnt: (id: string, updates: Partial<EnemyAnt>) => void;
  
  addResource: (resource: Resource) => void;
  removeResource: (id: string) => void;
  
  resetGame: () => void;
  
  colonyPosition: [number, number, number];
  movePlayer: (position: [number, number, number]) => void;
}

// Create the game store
export const useStore = create<GameState>((set, get) => ({
  // Initial state
  worldSize: 200,
  playerPosition: [5, 0.5, 5], // Start player 5 units away from colony
  playerRotation: 0, // Initial rotation
  health: 100,
  food: 50,
  materials: 20,
  playerAnts: [
    { 
      id: 'player-ant-1', 
      position: [5, 0.5, 5], // Start player 5 units away from colony
      active: true,
      health: 100
    }
  ],
  activeAntIndex: 0,
  colonies: [],
  resources: [],
  enemyAnts: [],
  enemiesDefeated: 0,
  colonyLevel: 1,
  colonySize: 10,
  
  // UI state
  showMessage: '',
  messageTimeout: 0,
  
  // Methods
  moveColony: (position) => {
    set((state) => {
      const colonies = [...state.colonies];
      const playerColonyIndex = colonies.findIndex(c => c.id === 'player-colony');
      
      if (playerColonyIndex !== -1) {
        colonies[playerColonyIndex] = {
          ...colonies[playerColonyIndex],
          position
        };
      }
      
      return { colonies };
    });
  },
  
  addColony: (colony) => {
    set((state) => ({
      colonies: [...state.colonies, colony]
    }));
  },
  
  addEnemyColony: (colony) => {
    set((state) => ({
      colonies: [...state.colonies, {...colony, relation: 'enemy'}]
    }));
  },
  
  removeColony: (id) => {
    set((state) => ({
      colonies: state.colonies.filter(colony => colony.id !== id)
    }));
  },
  
  updateColony: (id, updates) => {
    set((state) => {
      const colonies = [...state.colonies];
      const index = colonies.findIndex(c => c.id === id);
      
      if (index !== -1) {
        colonies[index] = {
          ...colonies[index],
          ...updates
        };
      }
      
      return { colonies };
    });
  },
  
  upgradeColony: () => {
    const { enemiesDefeated, food } = get();
    const requiredEnemies = Math.pow(2, get().colonyLevel - 1);
    const requiredFood = Math.pow(2, get().colonyLevel) * 10;

    if (enemiesDefeated >= requiredEnemies && food >= requiredFood) {
      set(state => ({
        colonyLevel: state.colonyLevel + 1,
        food: state.food - requiredFood,
        showMessage: `Colony upgraded to level ${state.colonyLevel + 1}!`,
        messageTimeout: Date.now() + 3000
      }));
    }
  },
  
  increaseColonySize: () => {
    const { food } = get();
    const costPerAnt = 5;
    
    // Check if player has enough food
    if (food >= costPerAnt) {
      set((state) => {
        // Generate a random offset from the colony center for the spawn position
        const randomAngle = Math.random() * Math.PI * 2;
        const spawnDistance = 3 + Math.random() * 2; // 3-5 units away from colony
        
        // Add new ant to player's colony with offset position on the ground
        const newAnt: PlayerAnt = {
          id: `player-ant-${state.playerAnts.length + 1}`,
          position: [
            Math.cos(randomAngle) * spawnDistance, // X offset
            0.5, // Y position on ground
            Math.sin(randomAngle) * spawnDistance // Z offset
          ],
          active: false,
          health: 100
        };
        
        return {
          colonySize: state.colonySize + 1,
          food: state.food - costPerAnt,
          playerAnts: [...state.playerAnts, newAnt]
        };
      });
      
      // Also update the colony in the colonies array
      get().updateColony('player-colony', {
        size: get().colonySize
      });
    }
  },
  
  updatePlayerPosition: (position) => {
    set((state) => {
      // Update the active ant's position
      const playerAnts = [...state.playerAnts];
      playerAnts[state.activeAntIndex].position = position;
      
      return {
        playerPosition: position,
        playerAnts
      };
    });
  },
  
  updatePlayerRotation: (rotation) => {
    set({ playerRotation: rotation });
  },
  
  switchActiveAnt: (index) => {
    if (index >= 0 && index < get().playerAnts.length) {
      // Mark current ant as inactive
      const playerAnts = [...get().playerAnts];
      
      playerAnts[get().activeAntIndex].active = false;
      playerAnts[index].active = true;
      
      set({
        activeAntIndex: index,
        playerPosition: playerAnts[index].position,
        playerAnts
      });
    }
  },
  
  addPlayerAnt: () => {
    const { increaseColonySize } = get();
    increaseColonySize();
  },
  
  collectResource: (id: string) => {
    set(state => {
      const resource = state.resources.find(r => r.id === id);
      if (!resource) return state;
      
      // Add value to appropriate store
      let food = state.food;
      let materials = state.materials;
      
      if (resource.type === 'food') {
        food += resource.value;
      } else {
        materials += resource.value;
      }
      
      // Remove resource from world
      const resources = state.resources.filter(r => r.id !== id);
      
      return {
        resources,
        food,
        materials,
      };
    });
  },
  
  damagePlayer: (amount) => {
    set((state) => {
      // Damage active ant
      const playerAnts = [...state.playerAnts];
      const activeAnt = playerAnts[state.activeAntIndex];
      activeAnt.health = Math.max(0, activeAnt.health - amount);
      
      // If ant died, switch to another ant if available
      if (activeAnt.health <= 0) {
        const availableAnt = playerAnts.findIndex(ant => ant.health > 0 && ant.id !== activeAnt.id);
        
        if (availableAnt !== -1) {
          playerAnts[state.activeAntIndex].active = false;
          playerAnts[availableAnt].active = true;
          
          return {
            playerAnts,
            activeAntIndex: availableAnt,
            playerPosition: playerAnts[availableAnt].position,
            health: playerAnts[availableAnt].health
          };
        }
      }
      
      return {
        playerAnts,
        health: activeAnt.health
      };
    });
  },
  
  defeatEnemy: () => {
    set((state) => ({
      enemiesDefeated: state.enemiesDefeated + 1,
      food: state.food + 10 // Bonus food for defeating enemy
    }));
  },
  
  addEnemyAnt: (ant) => {
    set((state) => {
      // Check if ant with this ID already exists
      const exists = state.enemyAnts.some(existing => existing.id === ant.id);
      if (exists) {
        // Return unchanged state if ant already exists
        return state;
      }
      
      // Only add if it doesn't exist
      return {
        enemyAnts: [...state.enemyAnts, ant]
      };
    });
  },
  
  removeEnemyAnt: (id) => {
    set((state) => {
      // Check if the ant exists before attempting to filter
      const antExists = state.enemyAnts.some(ant => ant.id === id);
      if (!antExists) {
        // If the ant doesn't exist, return the state unchanged
        return state;
      }

      // Only filter if the ant exists
      return {
        enemyAnts: state.enemyAnts.filter(ant => ant.id !== id)
      };
    });
  },
  
  updateEnemyAnt: (id, updates) => {
    set((state) => {
      // Check if the ant exists before attempting to update
      const index = state.enemyAnts.findIndex(a => a.id === id);
      if (index === -1) {
        // If the ant doesn't exist, return the state unchanged
        return state;
      }
      
      // Create a copy of the enemy ants array
      const enemyAnts = [...state.enemyAnts];
      
      // Update the specific ant
      enemyAnts[index] = {
        ...enemyAnts[index],
        ...updates
      };
      
      return { enemyAnts };
    });
  },
  
  addResource: (resource: Resource) => {
    set(state => ({
      resources: [...state.resources, resource]
    }));
  },
  
  removeResource: (id: string) => {
    set(state => ({
      resources: state.resources.filter(r => r.id !== id)
    }));
  },
  
  resetGame: () => {
    set({
      worldSize: 200,
      playerPosition: [5, 0.5, 5], // Start player 5 units away from colony
      playerRotation: 0, // Initial rotation
      health: 100,
      food: 50,
      materials: 20,
      playerAnts: [
        { 
          id: 'player-ant-1', 
          position: [5, 0.5, 5], // Start player 5 units away from colony
          active: true,
          health: 100
        }
      ],
      activeAntIndex: 0,
      colonies: [],
      resources: [],
      enemyAnts: [],
      enemiesDefeated: 0,
      colonyLevel: 1,
      colonySize: 10,
    });
  },
  
  colonyPosition: [0, 0, 0],
  movePlayer: (position) => set({ playerPosition: position }),
}));
