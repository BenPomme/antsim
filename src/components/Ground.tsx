import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePlane } from '@react-three/cannon'
import { Mesh } from 'three'
import { useStore } from '../store/gameStore'

export default function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
  }))

  const groundRef = useRef<Mesh>(null)
  const { worldSize } = useStore()

  useFrame(() => {
    if (groundRef.current) {
      groundRef.current.rotation.y += 0.001
    }
  })

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[worldSize, worldSize]} />
      <meshStandardMaterial color="#303030" />
    </mesh>
  )
} 