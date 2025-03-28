import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Vector3 } from 'three';
import { useKeyboardControls } from '@react-three/drei';
import { useStore } from '../store/gameStore';

export default function Player() {
  // Get player stats from store
  const { updatePlayerPosition, updatePlayerRotation, health } = useStore();
  
  // Physics setup
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [0, 1, 0],
    args: [0.5],
    linearDamping: 0.95,
    angularFactor: [0, 0, 0], // Prevent rotation from physics
  }));
  
  // References for movement and rotation
  const groupRef = useRef<any>(null);
  const position = useRef<Vector3>(new Vector3(0, 1, 0));
  const velocity = useRef<Vector3>(new Vector3());
  const rotation = useRef<number>(0);
  const direction = useRef<Vector3>(new Vector3());
  
  // Keyboard controls state
  const [, get] = useKeyboardControls();
  const isMoving = useRef({ forward: false, backward: false });
  const isTurning = useRef({ left: false, right: false });
  
  // Add a cooldown for the space key
  const [spacePressed, setSpacePressed] = useState(false);
  const spaceCooldown = useRef<number>(0);
  
  // Initialize references
  useEffect(() => {
    const unsubscribe = api.position.subscribe(p => {
      position.current.set(p[0], p[1], p[2]);
    });
    
    return unsubscribe;
  }, [api]);
  
  // Handle keyboard input for player movement
  useFrame((_, delta) => {
    const { forward, backward, left, right, jump, attack, collect } = get();
    
    isMoving.current = { forward, backward };
    isTurning.current = { left, right };
    
    // Handle jump/spawn ant with cooldown
    if (jump && !spacePressed && Date.now() > spaceCooldown.current) {
      setSpacePressed(true);
      spaceCooldown.current = Date.now() + 1000; // 1 second cooldown
      
      // Add a new ant to the player's colony
      const { increaseColonySize } = useStore.getState();
      increaseColonySize();
      
      setTimeout(() => setSpacePressed(false), 200);
    }
    
    // Handle attack
    if (attack) {
      // Attack nearest enemy - implement later
    }
    
    // Handle resource collection
    if (collect) {
      // Collect resources near player - implement later
    }
    
    // Update game state with current position
    updatePlayerPosition([position.current.x, position.current.y, position.current.z]);

    // Update velocity
    api.velocity.subscribe(v => velocity.current.set(v[0], v[1], v[2]));

    // Handle rotation (turning)
    const TURN_SPEED = 2.5;
    if (isTurning.current.left) {
      rotation.current += TURN_SPEED * delta;
      api.rotation.set(0, rotation.current, 0);
    }
    if (isTurning.current.right) {
      rotation.current -= TURN_SPEED * delta;
      api.rotation.set(0, rotation.current, 0);
    }

    // Update game state with current rotation
    updatePlayerRotation(rotation.current);

    // Apply current rotation to get proper forward direction
    const forward = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), rotation.current);

    // Handle movement
    if (isMoving.current.forward || isMoving.current.backward) {
      const speed = 5;
      const direction = isMoving.current.forward ? 1 : -1;
      
      // Calculate movement direction based on forward vector
      const moveDirection = new Vector3().copy(forward).multiplyScalar(direction);
      
      // Apply velocity in the proper direction
      api.velocity.set(moveDirection.x * speed, velocity.current.y, moveDirection.z * speed);
      
      // Animate legs when moving
      if (groupRef.current) {
        groupRef.current.children.forEach((child, index) => {
          if (child.name.includes('leg')) {
            child.rotation.x = Math.sin(Date.now() * 0.01 + index) * 0.5;
          }
        });
      }
    }
  });

  return (
    <group ref={ref as any}>
      {/* The group is now correctly oriented with the head forward */}
      <group ref={groupRef} position={[0, 0.4, 0]}>
        {/* Head */}
        <mesh castShadow position={[0, 0.1, 0.5]} name="head">
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
        
        {/* Thorax */}
        <mesh castShadow position={[0, 0.1, 0]} name="thorax">
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
        
        {/* Abdomen */}
        <mesh castShadow position={[0, 0.1, -0.5]} name="abdomen">
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
        
        {/* Legs */}
        {[...Array(3)].map((_, i) => (
          <group key={`leg-left-${i}`} name={`leg-left-${i}`}>
            <mesh castShadow position={[0.3, 0, -0.2 + i * 0.3]}>
              <boxGeometry args={[0.5, 0.1, 0.1]} />
              <meshStandardMaterial color="#ff0000" />
            </mesh>
          </group>
        ))}
        
        {[...Array(3)].map((_, i) => (
          <group key={`leg-right-${i}`} name={`leg-right-${i}`}>
            <mesh castShadow position={[-0.3, 0, -0.2 + i * 0.3]}>
              <boxGeometry args={[0.5, 0.1, 0.1]} />
              <meshStandardMaterial color="#ff0000" />
            </mesh>
          </group>
        ))}
        
        {/* Antennae */}
        <mesh castShadow position={[0.15, 0.2, 0.6]} name="antenna-left">
          <boxGeometry args={[0.05, 0.05, 0.3]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
        
        <mesh castShadow position={[-0.15, 0.2, 0.6]} name="antenna-right">
          <boxGeometry args={[0.05, 0.05, 0.3]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
      </group>
    </group>
  );
} 