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
  
  // Create procedural soil texture (since we're not loading external textures)
  const groundMaterialProps = {
    roughness: 0.8,
    metalness: 0.1,
    color: '#654321', // Brown soil
    onBeforeCompile: (shader: any) => {
      // Add UV coordinates to the shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec2 vUv;
        `
      );
      
      // Assign UV coordinates in the vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vUv = uv;
        `
      );
      
      // Add procedural noise to the ground
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        varying vec2 vUv;
        
        // Procedural noise functions
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));
          
          vec2 u = f * f * (3.0 - 2.0 * f);
          
          return mix(a, b, u.x) +
                  (c - a) * u.y * (1.0 - u.x) +
                  (d - b) * u.x * u.y;
        }
        
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(st * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
          }
          
          return value;
        }
        `
      );
      
      // Add soil texture variations to the color
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
          vec2 st = vUv * 30.0;
          float n = fbm(st);
          
          // Create different soil tones
          vec3 soilColor = vec3(0.4, 0.3, 0.2); // Base brown
          vec3 lightSoil = vec3(0.6, 0.48, 0.3); // Lighter spots
          vec3 darkSoil = vec3(0.3, 0.2, 0.1);   // Darker spots
          
          // Mix different soil tones based on noise
          vec3 finalColor = mix(soilColor, lightSoil, smoothstep(0.4, 0.6, n));
          finalColor = mix(finalColor, darkSoil, smoothstep(0.7, 0.9, n));
          
          // Add small pebbles and details
          float smallDetails = step(0.85, noise(st * 5.0));
          finalColor = mix(finalColor, vec3(0.5, 0.5, 0.5), smallDetails * 0.3);
          
          vec4 diffuseColor = vec4(finalColor, opacity);
        `
      );
    }
  };

  useFrame(() => {
    if (groundRef.current) {
      groundRef.current.rotation.y += 0.001
    }
  })

  return (
    <>
      {/* Main ground */}
      <mesh ref={ref as any} receiveShadow position={[0, -0.05, 0]}>
        <planeGeometry args={[worldSize, worldSize, 128, 128]} />
        <meshStandardMaterial {...groundMaterialProps} />
      </mesh>
      
      {/* Add a subtle glow around the player colony */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[8, 32]} />
        <meshStandardMaterial 
          color="#f8c05a" 
          transparent={true} 
          opacity={0.1} 
          emissive="#f8c05a"
          emissiveIntensity={0.2}
        />
      </mesh>
    </>
  )
} 