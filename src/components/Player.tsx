import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { Vector3, Group } from 'three';
import { useStore } from '../store/gameStore';

export default function Player() {
  const { movePlayer, moveColony, playerPosition } = useStore();
  const { camera } = useThree();
  const [ref, api] = useBox(() => ({
    mass: 1,
    position: playerPosition,
    args: [0.8, 0.4, 1.2],
    angularFactor: [0, 1, 0],
    linearDamping: 0.9,
  }));

  const groupRef = useRef<Group>(null);
  const velocity = useRef<Vector3>(new Vector3());
  const direction = useRef<Vector3>(new Vector3());
  const rotation = useRef<number>(0);
  const isMoving = useRef(false);
  const isTurning = useRef({ left: false, right: false });

  useEffect(() => {
    // Set colony position once at start
    moveColony([0, 0, 0]);

    // Add keyboard event listeners
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'w':
          direction.current.z = -1;
          isMoving.current = true;
          break;
        case 's':
          direction.current.z = 1;
          isMoving.current = true;
          break;
        case 'a':
          isTurning.current.left = true;
          break;
        case 'd':
          isTurning.current.right = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'w':
        case 's':
          direction.current.z = 0;
          if (direction.current.z === 0) {
            isMoving.current = false;
          }
          break;
        case 'a':
          isTurning.current.left = false;
          break;
        case 'd':
          isTurning.current.right = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [moveColony]);

  useFrame((_, delta) => {
    if (!ref.current) return;

    const position = ref.current.position;
    movePlayer([position.x, position.y, position.z]);

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

    // Apply current rotation to get proper forward direction
    const forward = new Vector3(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), rotation.current);
    const right = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), rotation.current);

    // Handle movement
    if (isMoving.current) {
      const speed = 5;
      
      // Calculate movement direction based on forward vector
      const moveDirection = new Vector3().copy(forward).multiplyScalar(direction.current.z);
      
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

    // Make camera follow the player
    const cameraOffset = new Vector3(0, 5, 8).applyAxisAngle(new Vector3(0, 1, 0), rotation.current);
    camera.position.set(
      position.x + cameraOffset.x,
      position.y + cameraOffset.y,
      position.z + cameraOffset.z
    );
    camera.lookAt(position.x, position.y, position.z);
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