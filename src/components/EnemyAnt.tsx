import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Vector3, Group, Quaternion } from 'three';
import { useStore, EnemyAnt as EnemyAntType } from '../store/gameStore';

// AI Constants 
const DECISION_INTERVAL = 1000; // ms between AI decisions
const ATTACK_RANGE = 2; // distance to player to attack
const SIGHT_RANGE = 50; // how far enemy can see
const PATROL_RADIUS = 20; // radius of patrol area around colony
const ATTACK_DAMAGE = 10; // damage per attack
const ATTACK_COOLDOWN = 1000; // ms between attacks
const MOVEMENT_SPEED = 3;

// Learning parameters
const BASE_LEARNING_RATE = 0.1;
const MAX_LEARNING_RATE = 0.5;

interface EnemyAntProps {
  position: [number, number, number];
  colonyId: string;
  strength: number;
}

const EnemyAnt = ({ position, colonyId, strength }: EnemyAntProps) => {
  // Get enemy data from store
  const id = useRef(`enemy-ant-${Math.random().toString(36).substr(2, 9)}`);
  const enemyAnts = useStore(state => state.enemyAnts);
  const addEnemyAnt = useStore(state => state.addEnemyAnt);
  const updateEnemyAnt = useStore(state => state.updateEnemyAnt);
  const removeEnemyAnt = useStore(state => state.removeEnemyAnt);
  
  // Get player data
  const playerPosition = useStore(state => state.playerPosition);
  const damagePlayer = useStore(state => state.damagePlayer);
  const defeatEnemy = useStore(state => state.defeatEnemy);
  
  // Physics and references
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position,
    args: [0.3],
    linearDamping: 0.9,
    angularFactor: [0, 0, 0], // prevent rotation
  }));
  
  const antRef = useRef<Group>(null);
  const velocity = useRef<Vector3>(new Vector3());
  const currentPosition = useRef<[number, number, number]>(position);
  const lastAttackTime = useRef<number>(0);
  
  // AI state
  const state = useRef<EnemyAntType['state']>('patrolling');
  const target = useRef<[number, number, number] | undefined>(undefined);
  const learningRate = useRef<number>(BASE_LEARNING_RATE);
  const successfulAttacks = useRef<number>(0);
  const health = useRef<number>(strength * 20);
  
  // Initialize enemy ant in store
  useEffect(() => {
    addEnemyAnt({
      id: id.current,
      position: currentPosition.current,
      colonyId,
      strength,
      health: health.current,
      state: 'patrolling',
      target: undefined,
      lastDecision: Date.now(),
      learningRate: learningRate.current,
      successfulAttacks: 0
    });
    
    return () => {
      removeEnemyAnt(id.current);
    };
  }, [addEnemyAnt, colonyId, position, removeEnemyAnt, strength]);
  
  // Listen for position updates from physics
  useEffect(() => {
    const unsubscribe = api.position.subscribe(pos => {
      currentPosition.current = [pos[0], pos[1], pos[2]];
      
      // Update position in store
      updateEnemyAnt(id.current, {
        position: currentPosition.current
      });
    });
    
    return unsubscribe;
  }, [api, id, updateEnemyAnt]);
  
  // AI decision making
  useEffect(() => {
    const makeDecisions = () => {
      const now = Date.now();
      const thisAnt = enemyAnts.find(ant => ant.id === id.current);
      
      if (!thisAnt) return;
      
      // Only make decisions periodically
      if (now - thisAnt.lastDecision < DECISION_INTERVAL) return;
      
      // Calculate distance to player
      const distanceToPlayer = new Vector3(
        playerPosition[0] - currentPosition.current[0],
        playerPosition[1] - currentPosition.current[1],
        playerPosition[2] - currentPosition.current[2]
      ).length();
      
      // Get colony position
      const colony = useStore.getState().colonies.find(c => c.id === colonyId);
      const colonyPosition = colony ? colony.position : [0, 0, 0];
      
      let newState = thisAnt.state;
      let newTarget = thisAnt.target;
      
      // Dynamic learning: increase learning rate based on successful attacks
      if (thisAnt.successfulAttacks > 0) {
        const newLearningRate = Math.min(
          BASE_LEARNING_RATE + (thisAnt.successfulAttacks * 0.05),
          MAX_LEARNING_RATE
        );
        learningRate.current = newLearningRate;
      }
      
      // Decision logic - more advanced with learning
      if (distanceToPlayer < ATTACK_RANGE) {
        // Attack when in range
        newState = 'attacking';
        newTarget = [...playerPosition];
      } else if (distanceToPlayer < SIGHT_RANGE) {
        // Chase player when visible
        const chaseRandom = Math.random();
        const learnedAggressiveness = learningRate.current;
        
        if (chaseRandom < learnedAggressiveness + 0.4) {
          // More successful attacks make the ant more likely to hunt
          newState = 'hunting';
          
          // With learning, the enemy might predict where the player is going
          if (thisAnt.successfulAttacks > 3) {
            // Advanced behavior: try to intercept player
            const playerDirection = useStore.getState().playerAnts[0].position.map(
              (coord, i) => coord - useStore.getState().playerPosition[i]
            );
            
            newTarget = [
              playerPosition[0] + playerDirection[0] * 2,
              playerPosition[1],
              playerPosition[2] + playerDirection[2] * 2,
            ] as [number, number, number];
          } else {
            newTarget = [playerPosition[0], playerPosition[1], playerPosition[2]] as [number, number, number];
          }
        } else {
          // Sometimes retreat to colony
          newState = 'returning';
          newTarget = [colonyPosition[0], colonyPosition[1], colonyPosition[2]] as [number, number, number];
        }
      } else {
        // Patrol around colony
        const distanceToColony = new Vector3(
          colonyPosition[0] - currentPosition.current[0],
          colonyPosition[1] - currentPosition.current[1],
          colonyPosition[2] - currentPosition.current[2]
        ).length();
        
        if (distanceToColony > PATROL_RADIUS || !newTarget) {
          newState = 'returning';
          newTarget = [colonyPosition[0], colonyPosition[1], colonyPosition[2]] as [number, number, number];
        } else if ((!newTarget || Math.random() < 0.1) && newState === 'patrolling') {
          // Generate new patrol point
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * PATROL_RADIUS;
          newTarget = [
            colonyPosition[0] + Math.cos(angle) * radius,
            colonyPosition[1],
            colonyPosition[2] + Math.sin(angle) * radius
          ] as [number, number, number];
        }
      }
      
      // Update ant in store
      updateEnemyAnt(id.current, {
        state: newState,
        target: newTarget,
        lastDecision: now,
        learningRate: learningRate.current
      });
      
      state.current = newState;
      target.current = newTarget;
    };
    
    // Periodically check for decisions
    const interval = setInterval(makeDecisions, 100);
    return () => clearInterval(interval);
  }, [api, colonyId, damagePlayer, defeatEnemy, enemyAnts, id, playerPosition, updateEnemyAnt]);
  
  // Handle movement and attacks
  useFrame((_, delta) => {
    if (!target.current) return;
    
    // Calculate direction to target
    const targetVector = new Vector3(
      target.current[0], 
      target.current[1], 
      target.current[2]
    );
    
    const position = new Vector3(
      currentPosition.current[0],
      currentPosition.current[1],
      currentPosition.current[2]
    );
    
    const direction = targetVector.clone().sub(position).normalize();
    
    // Set velocity based on state
    let speed = MOVEMENT_SPEED;
    if (state.current === 'hunting') {
      // Hunting is faster
      speed = MOVEMENT_SPEED * 1.5;
    } else if (state.current === 'returning') {
      // Returning is slower
      speed = MOVEMENT_SPEED * 0.8;
    }
    
    // Apply movement with learning adjustment for smoother pathfinding
    const learningAdjustment = learningRate.current * 2;
    api.velocity.set(
      direction.x * speed * (1 + learningAdjustment),
      velocity.current.y,
      direction.z * speed * (1 + learningAdjustment)
    );
    
    // Make ant face direction of movement
    if (antRef.current && direction.length() > 0) {
      const lookRotation = new Quaternion().setFromUnitVectors(
        new Vector3(0, 0, 1),
        new Vector3(direction.x, 0, direction.z).normalize()
      );
      antRef.current.quaternion.slerp(lookRotation, 5 * delta);
      
      // Animate legs when moving
      const walkingSpeed = 10;
      antRef.current.children.forEach((child, index) => {
        if (child.name.includes('leg')) {
          child.position.y = Math.sin(Date.now() * 0.01 * walkingSpeed + index) * 0.05 - 0.2;
        }
      });
    }
    
    // Attack logic
    if (state.current === 'attacking') {
      const now = Date.now();
      const distanceToPlayer = new Vector3(
        playerPosition[0] - currentPosition.current[0],
        playerPosition[1] - currentPosition.current[1],
        playerPosition[2] - currentPosition.current[2]
      ).length();
      
      if (distanceToPlayer < ATTACK_RANGE && now - lastAttackTime.current > ATTACK_COOLDOWN) {
        // Attack player
        damagePlayer(ATTACK_DAMAGE);
        lastAttackTime.current = now;
        
        // Track successful attack for learning
        successfulAttacks.current += 1;
        updateEnemyAnt(id.current, {
          successfulAttacks: successfulAttacks.current
        });
      }
    }
  });
  
  // Handle receiving damage
  const receiveDamage = (amount: number) => {
    health.current -= amount;
    
    updateEnemyAnt(id.current, {
      health: health.current
    });
    
    if (health.current <= 0) {
      // Enemy is defeated
      defeatEnemy();
      removeEnemyAnt(id.current);
      
      // Remove physics body
      if (ref.current) {
        ref.current.removeFromParent();
      }
    }
  };
  
  // Expose method to receive damage
  useEffect(() => {
    if (!ref.current) return;
    
    // Add a method to the ref that can be called by the player
    (ref.current as any).receiveDamage = receiveDamage;
  }, [ref]);

  return (
    <group ref={ref as any}>
      <group 
        ref={antRef}
        rotation={[0, 0, 0]}
        position={[0, 0, 0]}
      >
        {/* Enemy ant body - similar to player ant but red */}
        <mesh castShadow position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#aa0000" />
        </mesh>
        
        <mesh castShadow position={[0, 0.3, -0.5]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="#aa0000" />
        </mesh>
        
        {/* Head with mandibles */}
        <mesh castShadow position={[0, 0.25, 0.4]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#aa0000" />
        </mesh>
        
        {/* Mandibles */}
        <mesh position={[0.1, 0.2, 0.55]} rotation={[0, 0.3, 0]}>
          <coneGeometry args={[0.05, 0.2, 8]} />
          <meshStandardMaterial color="#330000" />
        </mesh>
        <mesh position={[-0.1, 0.2, 0.55]} rotation={[0, -0.3, 0]}>
          <coneGeometry args={[0.05, 0.2, 8]} />
          <meshStandardMaterial color="#330000" />
        </mesh>
        
        {/* Antennae */}
        <mesh position={[0.1, 0.4, 0.45]} rotation={[0.3, 0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.01, 0.5, 8]} />
          <meshStandardMaterial color="#330000" />
        </mesh>
        <mesh position={[-0.1, 0.4, 0.45]} rotation={[0.3, -0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.01, 0.5, 8]} />
          <meshStandardMaterial color="#330000" />
        </mesh>
        
        {/* Legs - left side */}
        <mesh name="leg-l1" position={[-0.3, 0, 0.2]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color="#990000" />
        </mesh>
        <mesh name="leg-l2" position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color="#990000" />
        </mesh>
        <mesh name="leg-l3" position={[-0.3, 0, -0.2]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color="#990000" />
        </mesh>
        
        {/* Legs - right side */}
        <mesh name="leg-r1" position={[0.3, 0, 0.2]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color="#990000" />
        </mesh>
        <mesh name="leg-r2" position={[0.3, 0, 0]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color="#990000" />
        </mesh>
        <mesh name="leg-r3" position={[0.3, 0, -0.2]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color="#990000" />
        </mesh>
      </group>
    </group>
  );
};

export default EnemyAnt; 