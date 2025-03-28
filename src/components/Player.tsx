import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Vector3, Raycaster } from 'three';
import { useKeyboardControls } from '@react-three/drei';
import { useStore } from '../store/gameStore';

export default function Player() {
  // Get player stats and methods from store
  const { 
    updatePlayerPosition,
    updatePlayerRotation,
    health,
    collectResource,
    resources,
    increaseColonySize,
    enemyAnts
  } = useStore();
  
  // Physics setup - now with a lower starting position and collision detection
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [5, 0.5, 5], // Start 5 units away from colony
    args: [0.5], // Sphere size for physics
    linearDamping: 0.95,
    angularFactor: [0, 0, 0], // Prevent rotation from physics
    fixedRotation: true, // Keep upright
    collisionFilterGroup: 1, // Player collision group
    collisionFilterMask: 1 | 2, // Collide with environment (1) and enemies (2)
  }));
  
  // References for movement and rotation
  const groupRef = useRef<any>(null);
  const position = useRef<Vector3>(new Vector3(5, 0.5, 5)); // Start 5 units away from colony
  const velocity = useRef<Vector3>(new Vector3());
  const rotation = useRef<number>(0);
  const direction = useRef<Vector3>(new Vector3());
  
  // Raycaster for ground detection and collisions
  const raycaster = useRef(new Raycaster());
  const isGrounded = useRef(true);
  
  // Cooldowns and timers
  const [spacePressed, setSpacePressed] = useState(false);
  const spaceCooldown = useRef<number>(0);
  const lastHarvestCheck = useRef<number>(0);
  const harvestCooldown = 500; // ms between harvest checks
  const attackCooldown = useRef<number>(0);
  const collectCooldown = useRef<number>(0);
  
  // Automatic harvesting state
  const [harvestingResource, setHarvestingResource] = useState<string | null>(null);
  
  // Animation controls
  const bodyBobHeight = useRef(0);
  const legAnimSpeed = useRef(10);
  
  // Get scene for collision detection
  const { scene } = useThree();
  
  // Initialize references
  useEffect(() => {
    const unsubscribe = api.position.subscribe(p => {
      position.current.set(p[0], p[1], p[2]);
    });
    
    return unsubscribe;
  }, [api]);
  
  // Keyboard controls state
  const [, get] = useKeyboardControls();
  const isMoving = useRef({ forward: false, backward: false });
  const isTurning = useRef({ left: false, right: false });
  
  // Handle keyboard input for player movement
  useFrame((_, delta) => {
    const { forward, backward, left, right, jump, attack, collect } = get();
    
    // Update movement and turning flags
    isMoving.current = { forward, backward };
    isTurning.current = { left, right };
    
    // Check if the player is grounded
    raycaster.current.set(
      position.current,
      new Vector3(0, -1, 0)
    );
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    isGrounded.current = intersects.length > 0 && intersects[0].distance < 0.6;
    
    // Apply gravity if not grounded
    if (!isGrounded.current) {
      api.velocity.set(velocity.current.x, -9.8 * delta * 5, velocity.current.z);
    }
    
    // Handle jump/spawn ant with cooldown
    if (jump && !spacePressed && Date.now() > spaceCooldown.current) {
      setSpacePressed(true);
      spaceCooldown.current = Date.now() + 1000; // 1 second cooldown
      
      // Add a new ant to the player's colony if player has enough food
      if (useStore.getState().food >= 5) {
        increaseColonySize();
        console.log("Added new ant to colony");
      } else {
        console.log("Not enough food to add more ants");
      }
      
      setTimeout(() => setSpacePressed(false), 200);
    }
    
    // Handle attack with cooldown
    if (attack && Date.now() > attackCooldown.current) {
      attackCooldown.current = Date.now() + 500; // 500ms cooldown
      console.log("Attack pressed!");
      
      // Attack any nearby enemy ants
      let hasAttacked = false;
      enemyAnts.forEach(enemyAnt => {
        const antPos = new Vector3(enemyAnt.position[0], enemyAnt.position[1], enemyAnt.position[2]);
        const distanceToEnemy = position.current.distanceTo(antPos);
        
        // If enemy is within attack range
        if (distanceToEnemy < 2) {
          hasAttacked = true;
          // Implement damage logic - call the store directly to ensure it works
          console.log("Attacking enemy:", enemyAnt.id);
          
          // Apply damage to the enemy ant
          const strength = 20; // Player attack strength
          const currentHealth = enemyAnt.health;
          const newHealth = Math.max(0, currentHealth - strength);
          
          // Update enemy ant health
          useStore.getState().updateEnemyAnt(enemyAnt.id, {
            health: newHealth
          });
          
          // If enemy ant's health reaches 0, remove it and count as defeated
          if (newHealth <= 0) {
            useStore.getState().removeEnemyAnt(enemyAnt.id);
            useStore.getState().defeatEnemy();
            console.log("Enemy defeated!");
          }
        }
      });
      
      if (hasAttacked) {
        // Visual feedback for attack
        if (groupRef.current) {
          // Make mandibles move
          groupRef.current.children.forEach(child => {
            if (child.name.includes('mandible')) {
              const isLeft = child.name.includes('left');
              child.rotation.z = (isLeft ? 1 : -1) * Math.PI / 3;
              
              // Reset mandible position after 200ms
              setTimeout(() => {
                if (child) {
                  child.rotation.z = (isLeft ? 1 : -1) * Math.PI / 6;
                }
              }, 200);
            }
          });
        }
      }
    }
    
    // Handle collect with cooldown
    if (collect && Date.now() > collectCooldown.current) {
      collectCooldown.current = Date.now() + 500; // 500ms cooldown
      console.log("Collect pressed!");
      
      // Check for nearby resources
      let hasCollected = false;
      resources.forEach(resource => {
        const resourcePos = new Vector3(resource.position[0], resource.position[1], resource.position[2]);
        const distanceToResource = position.current.distanceTo(resourcePos);
        
        // If resource is within collection range
        if (distanceToResource < 2) {
          hasCollected = true;
          setHarvestingResource(resource.id);
          collectResource(resource.id);
          console.log("Collected resource:", resource.id);
          
          // Visual feedback for collection
          if (groupRef.current) {
            // Increase leg animation speed when harvesting
            legAnimSpeed.current = 15;
            
            // Reset animation speed after 500ms
            setTimeout(() => {
              legAnimSpeed.current = 10;
              setHarvestingResource(null);
            }, 500);
          }
        }
      });
    }
    
    // Auto-harvest resources nearby - check periodically to avoid performance impact
    if (Date.now() > lastHarvestCheck.current + harvestCooldown) {
      lastHarvestCheck.current = Date.now();
      
      // Check for nearby resources
      resources.forEach(resource => {
        const resourcePos = new Vector3(resource.position[0], resource.position[1], resource.position[2]);
        const distanceToResource = position.current.distanceTo(resourcePos);
        
        // If resource is within collection range, notify the player but don't auto-collect
        if (distanceToResource < 1.5 && !harvestingResource) {
          console.log("Resource nearby! Press E to collect.");
        }
      });
    }
    
    // Update game state with current position
    updatePlayerPosition([position.current.x, position.current.y, position.current.z]);

    // Handle rotation (turning)
    const TURN_SPEED = 2.5;
    if (isTurning.current.left) {
      rotation.current += TURN_SPEED * delta;
    }
    if (isTurning.current.right) {
      rotation.current -= TURN_SPEED * delta;
    }
    
    // Apply rotation to the physics body
    api.rotation.set(0, rotation.current, 0);

    // Update game state with current rotation
    updatePlayerRotation(rotation.current);

    // Calculate forward direction based on current rotation
    const forwardDir = new Vector3(0, 0, 1).applyAxisAngle(new Vector3(0, 1, 0), rotation.current);
    
    // Movement speed
    const SPEED = 5 * delta;
    
    // Handle forward/backward movement
    if (forward || backward) {
      const direction = forward ? 1 : -1;
      // Calculate new position
      const moveVec = forwardDir.clone().multiplyScalar(SPEED * direction);
      
      // Get current position
      const currentPos = new Vector3(position.current.x, position.current.y, position.current.z);
      
      // Calculate new position
      const newPos = currentPos.add(moveVec);
      
      // Apply new position directly using physics API
      api.position.set(newPos.x, newPos.y, newPos.z);
      
      if (forward) {
        console.log('Moving forward: ', newPos.x, newPos.y, newPos.z);
      } else {
        console.log('Moving backward: ', newPos.x, newPos.y, newPos.z);
      }
      
      // Animate body bob and legs
      bodyBobHeight.current = Math.sin(Date.now() * 0.01) * 0.05;
      
      // Animate legs when moving
      if (groupRef.current) {
        const time = Date.now() * 0.01;
        const currentLegSpeed = legAnimSpeed.current;
        
        groupRef.current.children.forEach((child, index) => {
          if (child.name.includes('leg')) {
            // More natural leg movement
            const isLeft = child.name.includes('left');
            const legPair = parseInt(child.name.split('-')[2]) || 0;
            const legPhase = legPair * (Math.PI / 3) + (isLeft ? 0 : Math.PI);
            
            // Primary leg movement
            child.rotation.x = Math.sin(time * currentLegSpeed * 0.1 + legPhase) * 0.5;
            
            // Lateral leg movement
            child.rotation.z = (isLeft ? 1 : -1) * 
              Math.abs(Math.sin(time * currentLegSpeed * 0.1 + legPhase)) * 0.2;
          }
        });
      }
    }
    
    // Apply body bob even when idle for natural breathing movement
    if (groupRef.current) {
      groupRef.current.position.y = 0.4 + bodyBobHeight.current;
    }
  });

  return (
    <group ref={ref as any}>
      {/* The group is now correctly oriented with the head forward */}
      <group ref={groupRef} position={[0, 0.4, 0]}>
        {/* Head */}
        <mesh castShadow position={[0, 0.1, 0.5]} name="head">
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#ff5500" />
        </mesh>
        
        {/* Thorax */}
        <mesh castShadow position={[0, 0.1, 0]} name="thorax">
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ff7700" />
        </mesh>
        
        {/* Abdomen */}
        <mesh castShadow position={[0, 0.1, -0.5]} name="abdomen">
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#ff9900" />
        </mesh>
        
        {/* Legs - more articulated */}
        {[...Array(3)].map((_, i) => (
          <group key={`leg-left-${i}`} name={`leg-left-${i}`} position={[0, 0, -0.2 + i * 0.3]}>
            <mesh castShadow position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
              <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
              <meshStandardMaterial color="#ff6600" />
            </mesh>
            <mesh castShadow position={[0.4, -0.2, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
              <meshStandardMaterial color="#ff6600" />
            </mesh>
          </group>
        ))}
        
        {[...Array(3)].map((_, i) => (
          <group key={`leg-right-${i}`} name={`leg-right-${i}`} position={[0, 0, -0.2 + i * 0.3]}>
            <mesh castShadow position={[-0.2, 0, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
              <meshStandardMaterial color="#ff6600" />
            </mesh>
            <mesh castShadow position={[-0.4, -0.2, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
              <meshStandardMaterial color="#ff6600" />
            </mesh>
          </group>
        ))}
        
        {/* Antennae */}
        <mesh castShadow position={[0.15, 0.2, 0.6]} rotation={[Math.PI / 4, 0, Math.PI / 8]} name="antenna-left">
          <cylinderGeometry args={[0.02, 0.01, 0.4, 8]} />
          <meshStandardMaterial color="#ff6600" />
        </mesh>
        
        <mesh castShadow position={[-0.15, 0.2, 0.6]} rotation={[Math.PI / 4, 0, -Math.PI / 8]} name="antenna-right">
          <cylinderGeometry args={[0.02, 0.01, 0.4, 8]} />
          <meshStandardMaterial color="#ff6600" />
        </mesh>
        
        {/* Mandibles */}
        <mesh castShadow position={[0.1, 0, 0.6]} rotation={[0, 0, Math.PI / 6]} name="mandible-left">
          <boxGeometry args={[0.15, 0.04, 0.04]} />
          <meshStandardMaterial color="#ff4400" />
        </mesh>
        
        <mesh castShadow position={[-0.1, 0, 0.6]} rotation={[0, 0, -Math.PI / 6]} name="mandible-right">
          <boxGeometry args={[0.15, 0.04, 0.04]} />
          <meshStandardMaterial color="#ff4400" />
        </mesh>
        
        {/* Resource being carried (if harvesting) */}
        {harvestingResource && (
          <mesh castShadow position={[0, 0.4, 0]} name="carried-resource">
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#8BC34A" />
          </mesh>
        )}
      </group>
      
      {/* Add a small shadow indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
} 