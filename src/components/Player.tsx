import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { Vector3, Group } from 'three';
import { useKeyboardControls } from '@react-three/drei';
import { useStore } from '../store/gameStore';

const SPEED = 5;
const JUMP_FORCE = 8;
const CAMERA_DISTANCE = 5;
const CAMERA_HEIGHT = 3;

const Player = () => {
  const { camera } = useThree();
  const [ref, api] = useSphere(() => ({
    mass: 1,
    type: 'Dynamic',
    position: [0, 3, 0],
    angularFactor: [0, 0, 0], // Prevent rotation/rolling
    linearDamping: 0.9, // Add damping to reduce sliding
  }));

  // Movement state
  const velocity = useRef<Vector3>(new Vector3());
  const position = useRef<[number, number, number]>([0, 0, 0]);
  const antRef = useRef<Group>(null);
  const canJump = useRef(true);
  
  // Get store functions
  const updatePlayerPosition = useStore(state => state.updatePlayerPosition);
  const moveColony = useStore(state => state.moveColony);
  const playerAnts = useStore(state => state.playerAnts);
  const activeAntIndex = useStore(state => state.activeAntIndex);
  const switchActiveAnt = useStore(state => state.switchActiveAnt);
  
  // Set colony position once at start
  useEffect(() => {
    // Set colony at a specific starting position
    moveColony([0, 0, 0]);
  }, [moveColony]);

  // Subscribe to position and velocity changes
  useEffect(() => {
    const unsubscribePosition = api.position.subscribe(v => {
      position.current = [v[0], v[1], v[2]];
      // Update the global player position for radar and other components
      updatePlayerPosition(position.current);
    });
    
    const unsubscribeVelocity = api.velocity.subscribe(v => {
      velocity.current.set(v[0], v[1], v[2]);
      
      // Reset jump ability when landing
      if (Math.abs(v[1]) < 0.1 && v[1] >= 0) {
        canJump.current = true;
      }
    });

    return () => {
      unsubscribePosition();
      unsubscribeVelocity();
    };
  }, [api, updatePlayerPosition]);

  // Get keyboard controls
  const [, get] = useKeyboardControls();
  
  // Handle switching between ants
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Switch ants with number keys 1-9
      if (e.key >= '1' && e.key <= '9') {
        const antIndex = parseInt(e.key) - 1;
        if (antIndex < playerAnts.length) {
          switchActiveAnt(antIndex);
          
          // Teleport sphere physics to new ant position
          const newPosition = playerAnts[antIndex].position;
          api.position.set(newPosition[0], newPosition[1], newPosition[2]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerAnts, switchActiveAnt, api.position]);

  // Handle player movement and camera position
  useFrame(() => {
    const { forward, backward, left, right, jump } = get();
    
    // Calculate movement direction
    const direction = new Vector3();
    
    // Create a target vector for the ant model to look at
    const lookTarget = new Vector3();
    let hasDirection = false;
    
    // Forward/backward movement (relative to ant's current rotation)
    if (forward) {
      if (antRef.current) {
        const forwardVector = new Vector3(0, 0, 1).applyQuaternion(antRef.current.quaternion);
        direction.add(forwardVector);
        lookTarget.copy(forwardVector).multiplyScalar(10).add(new Vector3(position.current[0], position.current[1], position.current[2]));
        hasDirection = true;
      }
    } else if (backward) {
      if (antRef.current) {
        const backwardVector = new Vector3(0, 0, -1).applyQuaternion(antRef.current.quaternion);
        direction.add(backwardVector);
        lookTarget.copy(backwardVector).multiplyScalar(10).add(new Vector3(position.current[0], position.current[1], position.current[2]));
        hasDirection = true;
      }
    }
    
    // Turning left/right (rotate ant and change direction)
    if (right) {
      if (antRef.current) {
        antRef.current.rotation.y -= 0.05;
      }
    } else if (left) {
      if (antRef.current) {
        antRef.current.rotation.y += 0.05;
      }
    }
    
    // Normalize and apply movement
    if (direction.length() > 0) {
      direction.normalize().multiplyScalar(SPEED);
      api.velocity.set(direction.x, velocity.current.y, direction.z);
    } else {
      api.velocity.set(0, velocity.current.y, 0);
    }
    
    // Handle jumping - only once until landing
    if (jump && canJump.current && Math.abs(velocity.current.y) < 0.1) {
      api.velocity.set(velocity.current.x, JUMP_FORCE, velocity.current.z);
      canJump.current = false;
    }
    
    // Position the camera for third-person view
    if (antRef.current) {
      // Get ant's backward direction for camera positioning
      const antRotation = antRef.current.rotation.y;
      const cameraX = position.current[0] - Math.sin(antRotation) * CAMERA_DISTANCE;
      const cameraZ = position.current[2] - Math.cos(antRotation) * CAMERA_DISTANCE;
      
      // Set camera position
      camera.position.set(
        cameraX,
        position.current[1] + CAMERA_HEIGHT,
        cameraZ
      );
      
      // Make camera look at the ant
      camera.lookAt(
        position.current[0],
        position.current[1] + 0.5,
        position.current[2]
      );
    }
    
    // DO NOT update colony position to follow player - removed this section
    
    // Animate ant legs when moving
    if (antRef.current && (forward || backward)) {
      const walkingSpeed = 10;
      // Animate legs (simplified for this implementation)
      antRef.current.children.forEach((child, index) => {
        if (child.name.includes('leg')) {
          child.position.y = Math.sin(Date.now() * 0.01 * walkingSpeed + index) * 0.05 - 0.2;
        }
      });
    }
  });
  
  // Generate different ant colors based on index
  const getAntColor = () => {
    return '#663300';
  };

  return (
    <group ref={ref as any}>
      <group 
        ref={antRef}
        rotation={[0, 0, 0]}
        position={[0, 0, 0]}
      >
        {/* Ant body - main segments */}
        <mesh castShadow position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
        
        <mesh castShadow position={[0, 0.3, -0.5]}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
        
        {/* Head with mandibles */}
        <mesh castShadow position={[0, 0.25, 0.4]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
        
        {/* Mandibles */}
        <mesh position={[0.1, 0.2, 0.55]} rotation={[0, 0.3, 0]}>
          <coneGeometry args={[0.05, 0.2, 8]} />
          <meshStandardMaterial color="#333300" />
        </mesh>
        <mesh position={[-0.1, 0.2, 0.55]} rotation={[0, -0.3, 0]}>
          <coneGeometry args={[0.05, 0.2, 8]} />
          <meshStandardMaterial color="#333300" />
        </mesh>
        
        {/* Antennae */}
        <mesh position={[0.1, 0.4, 0.45]} rotation={[0.3, 0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.01, 0.5, 8]} />
          <meshStandardMaterial color="#333300" />
        </mesh>
        <mesh position={[-0.1, 0.4, 0.45]} rotation={[0.3, -0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.01, 0.5, 8]} />
          <meshStandardMaterial color="#333300" />
        </mesh>
        
        {/* Legs - left side */}
        <mesh name="leg-l1" position={[-0.3, 0, 0.2]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
        <mesh name="leg-l2" position={[-0.3, 0, 0]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
        <mesh name="leg-l3" position={[-0.3, 0, -0.2]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
        
        {/* Legs - right side */}
        <mesh name="leg-r1" position={[0.3, 0, 0.2]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
        <mesh name="leg-r2" position={[0.3, 0, 0]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
        <mesh name="leg-r3" position={[0.3, 0, -0.2]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.03, 0.02, 0.4]} />
          <meshStandardMaterial color={getAntColor()} />
        </mesh>
      </group>
    </group>
  );
};

export default Player; 