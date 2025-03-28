import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { Vector3, Group } from 'three';
import { useStore } from '../store/gameStore';

export default function Player() {
  const { movePlayer, moveColony, playerPosition } = useStore();
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
  const isMoving = useRef(false);

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
          direction.current.x = -1;
          isMoving.current = true;
          break;
        case 'd':
          direction.current.x = 1;
          isMoving.current = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'w':
        case 's':
          direction.current.z = 0;
          break;
        case 'a':
        case 'd':
          direction.current.x = 0;
          break;
      }
      // Check if no movement keys are pressed
      if (direction.current.x === 0 && direction.current.z === 0) {
        isMoving.current = false;
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

    // Update velocity and direction
    api.velocity.subscribe(v => velocity.current.set(v[0], v[1], v[2]));

    // Handle movement
    if (isMoving.current) {
      const speed = 5;
      
      // Calculate movement direction
      const moveDirection = new Vector3(direction.current.x, 0, direction.current.z).normalize();
      const moveSpeed = moveDirection.multiplyScalar(speed);
      
      // Apply velocity
      api.velocity.set(moveSpeed.x, velocity.current.y, moveSpeed.z);
      
      // Rotate player to face movement direction
      if (moveDirection.length() > 0) {
        const angle = Math.atan2(moveDirection.x, moveDirection.z);
        api.rotation.set(0, angle, 0);
      }
      
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
      <group ref={groupRef} position={[0, 0.4, 0]} rotation={[0, Math.PI, 0]}>
        {/* Head */}
        <mesh castShadow position={[0, 0.1, 0.5]} name="head">
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
        
        {/* Thorax */}
        <mesh castShadow position={[0, 0.1, 0]} name="thorax">
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
        
        {/* Abdomen */}
        <mesh castShadow position={[0, 0.1, -0.5]} name="abdomen">
          <sphereGeometry args={[0.4, 8, 8]} />
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