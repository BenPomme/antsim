import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Raycaster } from 'three';
import { useStore } from '../store/gameStore';

interface CameraControllerProps {
  distance?: number;
  height?: number;
  smoothing?: number;
  lookAtOffset?: number;
  minDistance?: number;
  maxDistance?: number;
}

const CameraController = ({
  distance = 7,
  height = 3,
  smoothing = 0.1,
  lookAtOffset = 1.0,
  minDistance = 3,
  maxDistance = 10
}: CameraControllerProps) => {
  const { camera } = useThree();
  const { playerPosition, playerRotation } = useStore();
  
  // Refs for smooth interpolation
  const currentCameraPosition = useRef(new Vector3());
  const targetCameraPosition = useRef(new Vector3());
  const lookAtPosition = useRef(new Vector3());
  const raycaster = useRef(new Raycaster());
  
  // Initialize camera position
  useEffect(() => {
    if (!playerPosition || !playerRotation) return;
    
    currentCameraPosition.current.set(
      playerPosition[0],
      playerPosition[1] + height,
      playerPosition[2] + distance
    );
    
    lookAtPosition.current.set(
      playerPosition[0],
      playerPosition[1] + lookAtOffset,
      playerPosition[2]
    );
    
    camera.position.copy(currentCameraPosition.current);
    camera.lookAt(lookAtPosition.current);
  }, []);
  
  useFrame(() => {
    if (!playerPosition || playerRotation === undefined) return;
    
    // Calculate the desired camera position based on player rotation and distance
    const rotationY = playerRotation;
    const offsetX = Math.sin(rotationY) * distance;
    const offsetZ = Math.cos(rotationY) * distance;
    
    // Update target position
    targetCameraPosition.current.set(
      playerPosition[0] - offsetX,
      playerPosition[1] + height,
      playerPosition[2] - offsetZ
    );
    
    // Check for collisions
    raycaster.current.set(
      new Vector3(playerPosition[0], playerPosition[1] + lookAtOffset, playerPosition[2]),
      new Vector3(-offsetX, height - lookAtOffset, -offsetZ).normalize()
    );
    
    // Smoothly interpolate current position towards target position
    currentCameraPosition.current.lerp(targetCameraPosition.current, smoothing);
    
    // Update camera position
    camera.position.copy(currentCameraPosition.current);
    
    // Update look-at position
    lookAtPosition.current.set(
      playerPosition[0],
      playerPosition[1] + lookAtOffset,
      playerPosition[2]
    );
    
    // Make camera look at player
    camera.lookAt(lookAtPosition.current);
  });
  
  return null;
};

export default CameraController; 