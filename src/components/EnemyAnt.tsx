import { useRef, useEffect, useState, useCallback } from 'react';
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

// Adaptive behavior parameters
const BASE_LEARNING_RATE = 0.1;
const MAX_LEARNING_RATE = 0.5;
const FORMATION_DISTANCE = 4; // Distance to maintain in formations
const COORDINATION_THRESHOLD = 3; // Number of ants needed for coordinated behavior

// Enhanced visuals
const BODY_SEGMENTS = ['head', 'thorax', 'abdomen'];
const LEG_PAIRS = 3; // Number of leg pairs
const MANDIBLE_SIZE = 0.1;

interface EnemyAntProps {
  position: [number, number, number];
  colonyId: string;
  strength: number;
  id: string; // Pass the ID from the parent
}

const EnemyAnt = ({ position, colonyId, strength, id }: EnemyAntProps) => {
  // Track if component is mounted to prevent updates after unmount
  const isMounted = useRef(true);
  
  // Get data from store
  const enemyAnts = useStore(state => state.enemyAnts);
  const updateEnemyAnt = useStore(state => state.updateEnemyAnt);
  const removeEnemyAnt = useStore(state => state.removeEnemyAnt);
  const playerPosition = useStore(state => state.playerPosition);
  const playerRotation = useStore(state => state.playerRotation);
  const damagePlayer = useStore(state => state.damagePlayer);
  const defeatEnemy = useStore(state => state.defeatEnemy);
  const colonies = useStore(state => state.colonies);
  
  // Find this ant's data in the store
  const thisAnt = enemyAnts.find(ant => ant.id === id);
  
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
  const bodyBobHeight = useRef<number>(0);
  const randomOffset = useRef<number>(Math.random() * 10);
  
  // Enhanced AI state
  const state = useRef<EnemyAntType['state']>(thisAnt?.state || 'patrolling');
  const target = useRef<[number, number, number] | undefined>(thisAnt?.target);
  const learningRate = useRef<number>(thisAnt?.learningRate || BASE_LEARNING_RATE);
  const successfulAttacks = useRef<number>(thisAnt?.successfulAttacks || 0);
  const health = useRef<number>(thisAnt?.health || strength * 20);
  const formationPosition = useRef<number>(Math.floor(Math.random() * 8)); // Position in formation
  const legSpeed = useRef<number>(10); // Controls animation speed
  
  // Track the last time we updated the store to throttle updates
  const lastUpdateTime = useRef(Date.now());
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      
      // If the component is unmounting due to user action (not due to a React error),
      // remove this ant from the store
      if (id) {
        setTimeout(() => {
          // Only attempt to remove if ant exists and component is genuinely unmounted
          const stillExists = enemyAnts.some(ant => ant.id === id);
          if (stillExists && !isMounted.current) {
            removeEnemyAnt(id);
          }
        }, 0);
      }
    };
  }, [id, enemyAnts, removeEnemyAnt]);
  
  // Listen for position updates from physics
  useEffect(() => {
    const unsubscribeFn = api.position.subscribe(pos => {
      if (!isMounted.current) return;
      
      currentPosition.current = [pos[0], pos[1], pos[2]];
      
      // Throttle updates to store
      const now = Date.now();
      if (now - lastUpdateTime.current > 100) { // Only update every 100ms
        lastUpdateTime.current = now;
        
        updateEnemyAnt(id, {
          position: currentPosition.current
        });
      }
    });
    
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [api, id, updateEnemyAnt]);
  
  // Decision making logic
  const makeDecisions = useCallback(() => {
    if (!isMounted.current || !thisAnt) return;
    
    const now = Date.now();
    
    // Calculate distance to player
    const distanceToPlayer = new Vector3(
      playerPosition[0] - currentPosition.current[0],
      playerPosition[1] - currentPosition.current[1],
      playerPosition[2] - currentPosition.current[2]
    ).length();
    
    // Get colony position
    const colony = colonies.find(c => c.id === colonyId);
    const colonyPosition = colony ? colony.position : [0, 0, 0];
    
    // Get nearby enemy ants for coordination
    const nearbyEnemyAnts = enemyAnts.filter(ant => {
      if (ant.id === id) return false;
      
      const antPos = new Vector3(ant.position[0], ant.position[1], ant.position[2]);
      const myPos = new Vector3(currentPosition.current[0], currentPosition.current[1], currentPosition.current[2]);
      
      return antPos.distanceTo(myPos) < FORMATION_DISTANCE * 2;
    });
    
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
    
    // Advanced decision logic with group coordination
    if (distanceToPlayer < ATTACK_RANGE) {
      // Attack when in range
      newState = 'attacking';
      newTarget = [...playerPosition];
      
      // Update animation speed for attacking
      legSpeed.current = 20;
    } else if (distanceToPlayer < SIGHT_RANGE) {
      // Coordinated behavior when multiple ants are present
      if (nearbyEnemyAnts.length >= COORDINATION_THRESHOLD) {
        // Form attack formation around player
        newState = 'hunting';
        
        // Calculate formation position around player
        const formationAngle = (Math.PI * 2 / 8) * formationPosition.current;
        const formationRadius = FORMATION_DISTANCE;
        
        // Calculate target point in formation
        newTarget = [
          playerPosition[0] + Math.cos(formationAngle) * formationRadius,
          playerPosition[1],
          playerPosition[2] + Math.sin(formationAngle) * formationRadius
        ] as [number, number, number];
        
        // Update animation speed for hunting
        legSpeed.current = 15;
      } else {
        // Solo behavior - chase with some intelligence
        const chaseRandom = Math.random();
        const learnedAggressiveness = learningRate.current;
        
        if (chaseRandom < learnedAggressiveness + 0.4) {
          // More successful attacks make the ant more likely to hunt
          newState = 'hunting';
          
          // With learning, the enemy might predict player movement
          if (thisAnt.successfulAttacks > 3) {
            // Try to intercept player based on player's direction
            const interceptDistance = 3 + Math.random() * 2;
            
            // Calculate point ahead of player based on their rotation
            newTarget = [
              playerPosition[0] + Math.sin(playerRotation) * interceptDistance,
              playerPosition[1],
              playerPosition[2] + Math.cos(playerRotation) * interceptDistance,
            ] as [number, number, number];
          } else {
            // Direct chase
            newTarget = [...playerPosition] as [number, number, number];
          }
          
          // Update animation speed for direct chase
          legSpeed.current = 18;
        } else {
          // Sometimes retreat to regroup
          newState = 'returning';
          newTarget = [...colonyPosition] as [number, number, number];
          
          // Update animation speed for returning
          legSpeed.current = 12;
        }
      }
    } else {
      // Rest of the decision logic for patrolling and other behaviors
      // ...
      
      // Patrol around colony with more intelligence
      const distanceToColony = new Vector3(
        colonyPosition[0] - currentPosition.current[0],
        colonyPosition[1] - currentPosition.current[1],
        colonyPosition[2] - currentPosition.current[2]
      ).length();
      
      // Return to colony if too far away
      if (distanceToColony > PATROL_RADIUS || !newTarget) {
        newState = 'returning';
        newTarget = [...colonyPosition] as [number, number, number];
        
        // Update animation speed for returning to colony
        legSpeed.current = 10;
      } else if (newState === 'patrolling') {
        // More intelligent patrol - create patrol patterns instead of random points
        if (!newTarget || Math.random() < 0.1) {
          // Create a patrol pattern based on ant's position in formation
          const patrolIndex = formationPosition.current % 4; // 4 different patrol patterns
          let angle, radius;
          
          switch (patrolIndex) {
            case 0:
              // Circle pattern
              angle = (now * 0.0001) % (Math.PI * 2);
              radius = PATROL_RADIUS * 0.7;
              break;
            case 1:
              // Figure-8 pattern
              angle = (now * 0.0001) % (Math.PI * 2);
              radius = PATROL_RADIUS * 0.5 * Math.sin(angle);
              angle = angle * 2;
              break;
            case 2:
              // Spiral outward
              angle = (now * 0.0001) % (Math.PI * 4);
              radius = (angle / (Math.PI * 4)) * PATROL_RADIUS * 0.8;
              break;
            case 3:
            default:
              // Random points but clustered in sectors
              const sectorAngle = Math.floor(Math.random() * 4) * (Math.PI / 2);
              angle = sectorAngle + (Math.random() - 0.5) * (Math.PI / 3);
              radius = PATROL_RADIUS * (0.3 + Math.random() * 0.6);
              break;
          }
          
          // Calculate new patrol target
          newTarget = [
            colonyPosition[0] + Math.cos(angle) * radius,
            colonyPosition[1],
            colonyPosition[2] + Math.sin(angle) * radius
          ] as [number, number, number];
          
          // Update animation speed for patrolling
          legSpeed.current = 8 + Math.random() * 4;
        }
      }
    }
    
    // Only update the store if the state or target has changed
    if ((newState !== thisAnt.state || newTarget !== thisAnt.target) && isMounted.current) {
      updateEnemyAnt(id, {
        state: newState,
        target: newTarget,
        lastDecision: now,
        learningRate: learningRate.current
      });
      
      state.current = newState;
      target.current = newTarget;
    }
  }, [
    thisAnt, enemyAnts, playerPosition, playerRotation, 
    colonies, colonyId, id, updateEnemyAnt, isMounted
  ]);
  
  // AI decision making interval
  useEffect(() => {
    if (!thisAnt) return;
    
    // Create the interval for making decisions
    const decisionInterval = setInterval(() => {
      if (!isMounted.current) return;
      
      const now = Date.now();
      if (now - thisAnt.lastDecision < DECISION_INTERVAL) return;
      
      makeDecisions();
    }, 500);
    
    return () => {
      clearInterval(decisionInterval);
    };
  }, [thisAnt, makeDecisions]);
  
  // Handle movement, attacks, and animation
  useFrame((_, delta) => {
    if (!thisAnt || !target.current || !antRef.current || !isMounted.current) return;
    
    const time = Date.now() * 0.001;
    
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
    
    // Set velocity based on state - more nuanced movement
    let speed = MOVEMENT_SPEED;
    
    switch (state.current) {
      case 'hunting':
        // Hunting is faster with acceleration
        speed = MOVEMENT_SPEED * (1.3 + Math.sin(time * 2) * 0.2);
        // Update body bob for eager hunting movement
        bodyBobHeight.current = Math.sin(time * 15) * 0.05;
        break;
      case 'attacking':
        // More erratic movement when attacking
        speed = MOVEMENT_SPEED * (1.5 + Math.sin(time * 8) * 0.3);
        direction.x += Math.sin(time * 12) * 0.1;
        direction.z += Math.cos(time * 12) * 0.1;
        direction.normalize();
        // Aggressive body movement
        bodyBobHeight.current = Math.sin(time * 20) * 0.07;
        break;
      case 'returning':
        // Smooth, deliberate movement when returning
        speed = MOVEMENT_SPEED * 0.9;
        bodyBobHeight.current = Math.sin(time * 10) * 0.03;
        break;
      case 'patrolling':
      default:
        // Casual, relaxed movement for patrolling
        speed = MOVEMENT_SPEED * (0.7 + Math.sin(time) * 0.1);
        // Gentle body bob for patrolling
        bodyBobHeight.current = Math.sin(time * 8) * 0.02;
        break;
    }
    
    // Apply movement with learning-based adjustments
    const learningAdjustment = 1 + (learningRate.current * 0.5);
    api.velocity.set(
      direction.x * speed * learningAdjustment,
      velocity.current.y,
      direction.z * speed * learningAdjustment
    );
    
    // Attack player logic
    if (state.current === 'attacking') {
      const now = Date.now();
      
      // Check if player is in attack range
      const playerPos = new Vector3(playerPosition[0], playerPosition[1], playerPosition[2]);
      const attackDistance = position.distanceTo(playerPos);
      
      if (attackDistance < ATTACK_RANGE && now - lastAttackTime.current > ATTACK_COOLDOWN) {
        // Perform attack with learning-adjusted damage
        const adjustedDamage = Math.round(ATTACK_DAMAGE * (1 + learningRate.current));
        
        // Damage player
        damagePlayer(adjustedDamage);
        
        // Record successful attack for learning
        successfulAttacks.current++;
        updateEnemyAnt(id, {
          successfulAttacks: successfulAttacks.current
        });
        
        // Reset attack cooldown
        lastAttackTime.current = now;
      }
    }
    
    // Make ant face direction of movement with smooth interpolation
    if (direction.length() > 0) {
      const targetLookAngle = Math.atan2(direction.z, direction.x) - Math.PI / 2;
      
      // Smooth rotation interpolation
      const currentRotationY = antRef.current.rotation.y;
      const rotationDifference = targetLookAngle - currentRotationY;
      
      // Handle angle wrapping
      let shortestRotation = rotationDifference;
      if (rotationDifference > Math.PI) shortestRotation = rotationDifference - Math.PI * 2;
      if (rotationDifference < -Math.PI) shortestRotation = rotationDifference + Math.PI * 2;
      
      // Apply smooth rotation with state-dependent responsiveness
      const rotationSpeed = state.current === 'attacking' ? 8 : 5;
      antRef.current.rotation.y += shortestRotation * delta * rotationSpeed;
      
      // Animate body
      if (antRef.current.children.length > 0) {
        const bodyGroup = antRef.current.children[0];
        bodyGroup.position.y = bodyBobHeight.current;
        // ... rest of the animation logic remains unchanged
      }
    }
  });
  
  // Damage handling function
  const receiveDamage = (amount: number) => {
    if (!isMounted.current) return;
    
    health.current -= amount;
    
    // Update health in store
    updateEnemyAnt(id, {
      health: health.current
    });
    
    // Check if defeated
    if (health.current <= 0) {
      defeatEnemy();
      removeEnemyAnt(id);
    }
  };

  // If this ant doesn't exist in the store, don't render it
  if (!thisAnt) return null;
  
  return (
    <group ref={ref as any}>
      <group ref={antRef} name={`enemy-ant-${id}`}>
        <group name="body" position={[0, 0, 0]}>
          {/* Head - slightly larger for enemy ants */}
          <mesh castShadow position={[0, 0.15, 0.2]} name="head">
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color="#CC0000" metalness={0.2} roughness={0.7} />
          </mesh>
          
          {/* Thorax - bulkier for enemy ants */}
          <mesh castShadow position={[0, 0.18, 0]} name="thorax">
            <sphereGeometry args={[0.15, 14, 12]} />
            <meshStandardMaterial color="#AA0000" metalness={0.2} roughness={0.7} />
          </mesh>
          
          {/* Abdomen - larger and more threatening */}
          <mesh castShadow position={[0, 0.18, -0.28]} name="abdomen">
            <sphereGeometry args={[0.18, 16, 14]} />
            <meshStandardMaterial color="#880000" metalness={0.2} roughness={0.7} />
          </mesh>
          
          {/* Neck connection with armor plating */}
          <mesh castShadow position={[0, 0.16, 0.1]} rotation={[Math.PI/2, 0, 0]} name="neck">
            <cylinderGeometry args={[0.08, 0.11, 0.1, 8]} />
            <meshStandardMaterial color="#AA0000" metalness={0.3} roughness={0.6} />
          </mesh>
          
          {/* Connection between thorax and abdomen */}
          <mesh castShadow position={[0, 0.18, -0.14]} rotation={[Math.PI/2, 0, 0]} name="waist">
            <cylinderGeometry args={[0.09, 0.07, 0.12, 8]} />
            <meshStandardMaterial color="#AA0000" metalness={0.3} roughness={0.6} />
          </mesh>
          
          {/* Legs - more intimidating with spikes */}
          {[...Array(3)].map((_, i) => (
            <group key={`leg-left-${i}`} name={`leg-left-${i}`} position={[0, 0.12, -0.1 + i * 0.15]}>
              <mesh castShadow rotation={[0, 0, Math.PI / 3]}>
                <cylinderGeometry args={[0.025, 0.025, 0.35, 8]} />
                <meshStandardMaterial color="#CC0000" metalness={0.3} roughness={0.6} />
              </mesh>
              <mesh castShadow position={[0.14, -0.06, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
                <meshStandardMaterial color="#CC0000" metalness={0.3} roughness={0.6} />
              </mesh>
              <mesh castShadow position={[0.26, -0.12, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.18, 8]} />
                <meshStandardMaterial color="#CC0000" metalness={0.3} roughness={0.6} />
              </mesh>
              {/* Spike on leg */}
              <mesh castShadow position={[0.1, -0.02, 0]} rotation={[0, 0, -Math.PI / 4]}>
                <coneGeometry args={[0.02, 0.06, 8]} />
                <meshStandardMaterial color="#880000" metalness={0.4} roughness={0.5} />
              </mesh>
            </group>
          ))}
          
          {[...Array(3)].map((_, i) => (
            <group key={`leg-right-${i}`} name={`leg-right-${i}`} position={[0, 0.12, -0.1 + i * 0.15]}>
              <mesh castShadow rotation={[0, 0, -Math.PI / 3]}>
                <cylinderGeometry args={[0.025, 0.025, 0.35, 8]} />
                <meshStandardMaterial color="#CC0000" metalness={0.3} roughness={0.6} />
              </mesh>
              <mesh castShadow position={[-0.14, -0.06, 0]}>
                <cylinderGeometry args={[0.02, 0.02, 0.25, 8]} />
                <meshStandardMaterial color="#CC0000" metalness={0.3} roughness={0.6} />
              </mesh>
              <mesh castShadow position={[-0.26, -0.12, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.18, 8]} />
                <meshStandardMaterial color="#CC0000" metalness={0.3} roughness={0.6} />
              </mesh>
              {/* Spike on leg */}
              <mesh castShadow position={[-0.1, -0.02, 0]} rotation={[0, 0, Math.PI / 4]}>
                <coneGeometry args={[0.02, 0.06, 8]} />
                <meshStandardMaterial color="#880000" metalness={0.4} roughness={0.5} />
              </mesh>
            </group>
          ))}
          
          {/* Enlarged, more threatening mandibles */}
          <group position={[0, 0.1, 0.28]} name="mandibles">
            <mesh castShadow position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 6]} name="mandible-left">
              <boxGeometry args={[0.14, 0.03, 0.03]} />
              <meshStandardMaterial color="#880000" metalness={0.3} roughness={0.6} />
            </mesh>
            
            <mesh castShadow position={[-0.06, 0, 0]} rotation={[0, 0, -Math.PI / 6]} name="mandible-right">
              <boxGeometry args={[0.14, 0.03, 0.03]} />
              <meshStandardMaterial color="#880000" metalness={0.3} roughness={0.6} />
            </mesh>
            
            {/* Mandible teeth */}
            <mesh castShadow position={[0.12, 0, 0]} rotation={[0, 0, 0]}>
              <coneGeometry args={[0.02, 0.05, 8]} />
              <meshStandardMaterial color="#660000" metalness={0.4} roughness={0.5} />
            </mesh>
            
            <mesh castShadow position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.02, 0.05, 8]} />
              <meshStandardMaterial color="#660000" metalness={0.4} roughness={0.5} />
            </mesh>
          </group>
          
          {/* Antennae */}
          <group position={[0, 0.2, 0.2]} name="antennae">
            <mesh castShadow position={[0.06, 0.05, 0.08]} rotation={[Math.PI / 4, 0, Math.PI / 8]} name="antenna-left">
              <cylinderGeometry args={[0.012, 0.012, 0.25, 6]} />
              <meshStandardMaterial color="#CC0000" metalness={0.2} roughness={0.7} />
            </mesh>
            
            <mesh castShadow position={[-0.06, 0.05, 0.08]} rotation={[Math.PI / 4, 0, -Math.PI / 8]} name="antenna-right">
              <cylinderGeometry args={[0.012, 0.012, 0.25, 6]} />
              <meshStandardMaterial color="#CC0000" metalness={0.2} roughness={0.7} />
            </mesh>
          </group>
          
          {/* Back spikes for more threatening appearance */}
          {[...Array(3)].map((_, i) => (
            <mesh 
              key={`back-spike-${i}`} 
              castShadow 
              position={[0, 0.25, -0.15 - i * 0.08]} 
              rotation={[Math.PI / 3, 0, 0]}
              name={`back-spike-${i}`}
            >
              <coneGeometry args={[0.03, 0.1, 8]} />
              <meshStandardMaterial color="#660000" metalness={0.3} roughness={0.6} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};

export default EnemyAnt; 