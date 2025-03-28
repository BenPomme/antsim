import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { useStore } from '../store/gameStore';
import { Resource as ResourceType } from '../store/gameStore';
import * as THREE from 'three';

interface ResourceProps {
  resource: ResourceType;
}

export default function Resource({ resource }: ResourceProps) {
  const { position, type } = resource;
  const { collectResource, playerPosition } = useStore();
  const [ref] = useBox(() => ({
    mass: 0,
    position,
    args: [0.5, 0.5, 0.5],
    type: 'Static',
  }));

  useFrame(() => {
    if (!ref.current) return;

    const distance = ref.current.position.distanceTo(
      new THREE.Vector3(playerPosition[0], playerPosition[1], playerPosition[2])
    );

    if (distance < 2) {
      collectResource(resource.id);
    }
  });

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color={type === 'food' ? '#ff0000' : '#00ff00'} />
    </mesh>
  );
} 